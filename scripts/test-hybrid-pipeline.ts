import dotenv from 'dotenv';
import { resolve } from 'path';
import FirecrawlApp from '@mendable/firecrawl-js';
import { getTemporalContext } from '../src/lib/temporal';
import { extractStructuredEventsFromHtml } from '../src/lib/schema-org';
import { extractFromUnstructuredMarkdown } from '../src/lib/discovery/deep-lane';
import { curateCandidatesWithLLM } from '../src/lib/discovery/curator';
import { MAX_PIPELINE_CANDIDATES } from '../src/lib/discovery/config';
import { calculateHaversineDistanceKm } from '../src/lib/geo';
import { CandidateEvent, ScrapedPageInput } from '../src/types';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const firecrawlKey = process.env.FIRECRAWL_API_KEY;

if (!firecrawlKey || firecrawlKey.includes('your_firecrawl_api_key')) {
  console.error('❌ Error: FIRECRAWL_API_KEY is missing or invalid in .env.local.');
  process.exit(1);
}

if (
  !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
  !process.env.GOOGLE_API_KEY &&
  !process.env.GEMINI_API_KEY
) {
  console.error('❌ Error: GOOGLE_GENERATIVE_AI_API_KEY is missing in .env.local.');
  process.exit(1);
}

// Reference user anchor (NYC) for Haversine verification
const USER_COORDS = { lat: 40.7128, lng: -73.95 };

// =============================================================================
// Lane A regression fixture: a DIY venue page with Schema.org MusicEvent JSON-LD
// anchored to the active weekend. Guarantees the deterministic lane has signal.
// =============================================================================

function buildStructuredFixtureHtml(weekendStart: Date): string {
  const isoDay = weekendStart.toISOString().split('T')[0];
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Model Living, Admin & Funsucker Live at Alphaville</title>
        <meta property="og:image" content="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80">
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "MusicEvent",
          "name": "Model Living, Admin & Funsucker (Live)",
          "description": "Lo-fi garage rock, jangly basement riffs, and raw post-punk showcase in the heart of Bushwick.",
          "startDate": "${isoDay}T21:00:00-04:00",
          "doorTime": "${isoDay}T20:00:00-04:00",
          "location": {
            "@type": "Place",
            "name": "Alphaville",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "140 Wilson Ave",
              "addressLocality": "Brooklyn",
              "postalCode": "11237",
              "addressRegion": "NY"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": 40.7041,
              "longitude": -73.9242
            }
          },
          "offers": {
            "@type": "Offer",
            "price": "12.00",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "url": "https://alphaville.org/tickets"
          },
          "image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
          "organizer": {
            "@type": "Organization",
            "name": "Alphaville Booking",
            "email": "booking@alphavillebk.com"
          }
        }
        </script>
      </head>
      <body>
        <h1>Model Living Live at Alphaville</h1>
      </body>
    </html>
  `;
}

// =============================================================================
// Harness: exercises the REAL production pipeline modules from src/
// =============================================================================

async function runTest(): Promise<void> {
  console.log('\n======================================================');
  console.log('   🚦 SideDoor — Two-Lane Hybrid Pipeline Harness');
  console.log('      (Runs against src/lib production modules)');
  console.log('======================================================\n');

  const userPrompt =
    process.argv[2] ||
    'indie rock shows, outdoor night fleas, or art vernissages within 20 km of me this weekend';
  const location = process.argv[3] || 'Brooklyn / New York City';

  const { currentDateStr, weekendStr, monthYearStr, targetWeekendRange } = getTemporalContext();

  console.log(`💬 User Request:     "${userPrompt}"`);
  console.log(`📍 Location Context: "${location}"`);
  console.log(`📅 Reference Date:   ${currentDateStr}`);
  console.log(`⏳ Target Weekend:   ${weekendStr} (${monthYearStr})\n`);

  const pipelineStart = Date.now();

  // STEP 1: Live Firecrawl search (markdown + rawHtml for JSON-LD)
  console.log('[1/4] Crawling live pages via Firecrawl (markdown + rawHtml)...');
  const crawlStart = Date.now();
  const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });
  const searchRes = await firecrawl.search(
    `indie venue calendars DIY shows ${location} ${monthYearStr}`,
    { limit: 3, scrapeOptions: { formats: ['markdown', 'rawHtml'] } }
  );
  const crawlElapsed = ((Date.now() - crawlStart) / 1000).toFixed(2);
  const webPages = ((searchRes as any)?.web || []) as any[];
  console.log(`✅ Crawled ${webPages.length} live pages in ${crawlElapsed}s.\n`);

  // Prepend the structured fixture so Lane A is exercised side-by-side with Lane B
  const allPages: ScrapedPageInput[] = [
    {
      url: 'https://alphavillebk.com/events/model-living-live',
      title: 'Model Living, Admin & Funsucker Live at Alphaville',
      markdown: 'Model Living live show at Alphaville in Bushwick.',
      rawHtml: buildStructuredFixtureHtml(targetWeekendRange.start),
      ogImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    },
    ...webPages.map((item) => ({
      url: item.url as string,
      title: (item.title || item.metadata?.title || 'Event Calendar Listing') as string,
      markdown: (item.markdown || '') as string,
      rawHtml: (item.rawHtml || item.html || '') as string,
      ogImage: (item.metadata?.ogImage || item.metadata?.['og:image'] || item.metadata?.image) as
        | string
        | undefined,
    })),
  ];

  // STEP 2: Lane dispatch — same logic shape as src/lib/discovery/pipeline.ts
  console.log('[2/4] Dispatching pages: Lane A (JSON-LD) vs Lane B (Deep-Lane)...');
  const laneA_Candidates: CandidateEvent[] = [];
  const laneB_Pages: ScrapedPageInput[] = [];

  for (const page of allPages) {
    const structured = extractStructuredEventsFromHtml(page.rawHtml || '', page.url, page.ogImage, {
      weekendStart: targetWeekendRange.start,
      weekendEnd: targetWeekendRange.end,
    });

    if (structured.length > 0) {
      console.log(`   🟢 [Lane A] Extracted ${structured.length} JSON-LD event(s) from: ${page.url}`);
      laneA_Candidates.push(...structured);
    } else {
      console.log(`   🟡 [Lane B] Forwarding to Gemini fallback: ${page.url}`);
      laneB_Pages.push(page);
    }
  }

  // STEP 3: Lane B via production deep-lane extractor
  let laneB_Candidates: CandidateEvent[] = [];
  if (laneB_Pages.length > 0) {
    console.log(`\n[3/4] Processing Lane B (${laneB_Pages.length} pages) via production deep-lane...`);
    const laneBStart = Date.now();
    laneB_Candidates = await extractFromUnstructuredMarkdown(laneB_Pages, userPrompt, location);
    const laneBElapsed = ((Date.now() - laneBStart) / 1000).toFixed(2);
    console.log(`✅ Lane B extracted ${laneB_Candidates.length} candidates in ${laneBElapsed}s.`);
  } else {
    console.log(`\n[3/4] Lane B skipped (all pages resolved through Lane A!).`);
  }

  const allCandidates = [...laneA_Candidates, ...laneB_Candidates].slice(0, MAX_PIPELINE_CANDIDATES);
  console.log(
    `\nTotal Consolidated Candidates: ${allCandidates.length} (Lane A: ${laneA_Candidates.length}, Lane B: ${laneB_Candidates.length}, cap: ${MAX_PIPELINE_CANDIDATES})`
  );

  // STEP 4: Semantic curator via production module (user coords as fallback anchor)
  console.log(`\n[4/4] Sending ${allCandidates.length} candidates to the semantic curator...`);
  const curatedStart = Date.now();
  const finalEvents = await curateCandidatesWithLLM(allCandidates, userPrompt, USER_COORDS);
  const curatedElapsed = ((Date.now() - curatedStart) / 1000).toFixed(2);
  console.log(`✅ Curator returned ${finalEvents.length} events in ${curatedElapsed}s.`);

  // Deterministic Haversine enrichment against the reference anchor
  const enrichedEvents = finalEvents.map((evt) =>
    typeof evt.coordinates?.lat === 'number' && typeof evt.coordinates?.lng === 'number'
      ? {
          ...evt,
          distanceKm: calculateHaversineDistanceKm(
            USER_COORDS.lat,
            USER_COORDS.lng,
            evt.coordinates.lat,
            evt.coordinates.lng
          ),
        }
      : evt
  );

  const totalElapsed = ((Date.now() - pipelineStart) / 1000).toFixed(2);
  console.log('\n======================================================');
  console.log(`🎉 Hybrid Pipeline Harness Success! (${enrichedEvents.length} Events, ${totalElapsed}s total)`);
  console.log('======================================================\n');

  enrichedEvents.forEach((evt, i) => {
    console.log(`--- [Event #${i + 1}] ${evt.title} ---------------------`);
    console.log(`🏷️  Category:     ${evt.category.toUpperCase()}`);
    console.log(`✨  Match Score:  ${evt.matchScore}% | Tagline: "${evt.tagline}"`);
    console.log(`📍  Venue:        ${evt.venueName} (${evt.address})`);
    console.log(`📐  Distance:     ${evt.distanceKm} km away [Exact Haversine calculation]`);
    console.log(`🕒  Date & Time:  ${evt.formattedDate} • ${evt.formattedTime}`);
    console.log(`🎟️  Admission:    ${evt.price} (isFree: ${evt.isFree})`);
    console.log(`🏷️  Vibe Tags:    ${evt.vibeTags.join(' ')}`);
    console.log(`🖼️  Flyer Image:  ${evt.coverImage || 'None'}`);
    console.log(`✉️  AgentMail:    ${evt.organizerName} <${evt.organizerEmail}>`);
    console.log(`🔗  Source:       ${evt.sourceUrl}`);
    console.log(`⚡  Extraction:   ${evt.firecrawlExtractedAt}`);
    console.log(`📝  Overview:     "${evt.description}"\n`);
  });
}

runTest().catch((err) => {
  console.error('\n❌ Fatal Test Error:', err);
  process.exit(1);
});
