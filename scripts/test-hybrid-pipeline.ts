import dotenv from 'dotenv';
import { resolve } from 'path';
import FirecrawlApp from '@mendable/firecrawl-js';
import { generateDiscoveryQueries } from '../src/lib/discovery/query-planner';
import { runHybridEventDiscovery } from '../src/lib/discovery/pipeline';
import { getTemporalContext } from '../src/lib/temporal';
import { ScrapedPageInput } from '../src/types';

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

// User anchor (Brooklyn/NYC) for Haversine distance verification
const USER_COORDS = { lat: 40.7128, lng: -73.95 };

// Optional fixture for offline / unit regression testing if --fixture flag is supplied
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
            "url": "https://alphavillebk.com/tickets"
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
// Harness: exercises the REAL 1:1 production pipeline (same as /api/scout)
// =============================================================================

async function runTest(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const includeFixture = process.argv.includes('--fixture');

  const userPrompt =
    args[0] ||
    'indie rock shows, outdoor night fleas, or art vernissages within 20 km of me this weekend';
  const location = args[1] || 'Brooklyn / New York City';

  const { currentDateStr, weekendStr, monthYearStr, targetWeekendRange } = getTemporalContext();

  console.log('\n======================================================');
  console.log('   🚦 SideDoor — Discovery Pipeline Test Harness');
  console.log('      (100% Aligned with /api/scout & Client App)');
  console.log('======================================================\n');
  console.log(`💬 User Request:     "${userPrompt}"`);
  console.log(`📍 Location Context: "${location}"`);
  console.log(`📅 Reference Date:   ${currentDateStr}`);
  console.log(`⏳ Target Weekend:   ${weekendStr} (${monthYearStr})`);
  if (includeFixture) {
    console.log(`🧪 Fixture Mode:     Enabled (Alphaville synthetic fixture included)`);
  }
  console.log('');

  const pipelineStart = Date.now();

  // STEP 1: Query generation via Gemini Flash (same as /api/scout)
  console.log('[1/3] Generating multi-angle search queries via Gemini Flash...');
  const queryStart = Date.now();
  const queryResult = await generateDiscoveryQueries(userPrompt, location);
  const queryElapsed = ((Date.now() - queryStart) / 1000).toFixed(2);
  console.log(`✅ Generated ${queryResult.queries.length} targeted search angles in ${queryElapsed}s:`);
  queryResult.queries.forEach((q, idx) => {
    console.log(`   ${idx + 1}. "${q}"`);
  });
  console.log(`   🏷️  Extracted Vibe Tags: [${queryResult.vibeTags.join(', ')}]\n`);

  // STEP 2: Multi-query parallel crawl via Firecrawl (markdown + rawHtml for JSON-LD)
  console.log('[2/3] Crawling web pages across all query angles in parallel...');
  const crawlStart = Date.now();
  const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });
  const searchSettled = await Promise.allSettled(
    queryResult.queries.map((q) =>
      firecrawl.search(q, {
        limit: 2,
        scrapeOptions: { formats: ['markdown', 'rawHtml'] },
      })
    )
  );

  const seenUrls = new Set<string>();
  const allScrapedPages: ScrapedPageInput[] = [];

  if (includeFixture) {
    allScrapedPages.push({
      url: 'https://alphavillebk.com/events/model-living-live',
      title: 'Model Living, Admin & Funsucker Live at Alphaville',
      markdown: 'Model Living live show at Alphaville in Bushwick.',
      rawHtml: buildStructuredFixtureHtml(targetWeekendRange.start),
      ogImage:
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    });
    seenUrls.add('https://alphavillebk.com/events/model-living-live');
  }

  for (const res of searchSettled) {
    if (res.status === 'fulfilled') {
      const items = (res.value as any)?.web || (res.value as any)?.data || [];
      for (const item of items) {
        if (!item.url || seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);

        const markdown = item.markdown || '';
        const rawHtml = item.rawHtml || item.html || '';
        const ogImage =
          item.metadata?.ogImage ||
          item.metadata?.['og:image'] ||
          item.metadata?.image;

        let flyerImage = ogImage;
        if (!flyerImage) {
          const mdImgMatch = markdown.match(
            /!\[.*?\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp|avif)[^\s)]*)\)/i
          );
          if (mdImgMatch) flyerImage = mdImgMatch[1];
        }

        allScrapedPages.push({
          url: item.url,
          title: item.title || item.metadata?.title || 'Event Calendar Listing',
          markdown,
          rawHtml,
          ogImage: flyerImage,
        });
      }
    }
  }

  const crawlElapsed = ((Date.now() - crawlStart) / 1000).toFixed(2);
  console.log(`✅ Crawled & deduplicated ${allScrapedPages.length} unique pages in ${crawlElapsed}s.\n`);

  if (allScrapedPages.length === 0) {
    console.warn('⚠️ No pages were retrieved from the search queries.');
    return;
  }

  // STEP 3: Execute the exact production hybrid pipeline
  console.log('[3/3] Executing production Hybrid Pipeline (Lane A + Lane B + Curator)...');
  const discoveryResult = await runHybridEventDiscovery(
    allScrapedPages,
    userPrompt,
    location,
    USER_COORDS
  );

  const totalElapsed = ((Date.now() - pipelineStart) / 1000).toFixed(2);
  const { events, stats } = discoveryResult;

  console.log('\n======================================================');
  console.log(`🎉 Pipeline Execution Complete! (${events.length} Events, ${totalElapsed}s total)`);
  console.log('======================================================');
  console.log(`📊 Pipeline Telemetry:`);
  console.log(`   - Input Scraped Pages:    ${stats.pagesScrapedCount}`);
  console.log(`   - Structured Fast Lane:   ${stats.structuredCount} events parsed`);
  console.log(`   - Deep Fallback Lane:     ${stats.unstructuredCount} events parsed`);
  console.log(`   - Total Curated Events:   ${events.length}`);
  console.log(`   - Curator Processing:     ${stats.curationTimeSec}s`);
  console.log(`   - Total Pipeline Time:    ${totalElapsed}s\n`);

  if (events.length === 0) {
    console.log('ℹ️  No events met the curation criteria for this weekend.\n');
    return;
  }

  events.forEach((evt, i) => {
    console.log(`--- [Event #${i + 1}] ${evt.title} ---------------------`);
    console.log(`🏷️  Category:     ${evt.category.toUpperCase()}`);
    console.log(`✨  Match Score:  ${evt.matchScore}% | Tagline: "${evt.tagline}"`);
    console.log(`📍  Venue:        ${evt.venueName} (${evt.address})`);
    console.log(`📐  Distance:     ${evt.distanceKm ?? 'N/A'} km away [Haversine]`);
    console.log(`🕒  Date & Time:  ${evt.formattedDate} • ${evt.formattedTime}`);
    console.log(`🎟️  Admission:    ${evt.price} (isFree: ${evt.isFree})`);
    console.log(`🏷️  Vibe Tags:    ${evt.vibeTags.join(' ')}`);
    console.log(`🖼️  Flyer Image:  ${evt.coverImage || 'None'}`);
    console.log(`✉️  AgentMail:    ${evt.organizerName} <${evt.organizerEmail}>`);
    console.log(`🔗  Source:       ${evt.sourceUrl}`);
    console.log(`⚡  Extraction:   ${evt.firecrawlExtractedAt}`);
    console.log(`📝  Overview:     "${evt.description}"\n`);
  });

  // Client filtering simulation
  console.log('======================================================');
  console.log('📱 Client-Side UI Filter Simulation (Default Filters):');
  console.log('   - Radius Filter:  <= 20 km');
  console.log('   - Min Score:      >= 65%');
  console.log('======================================================');
  const visibleInClient = events.filter((e) => {
    const withinRadius = typeof e.distanceKm === 'number' ? e.distanceKm <= 20 : true;
    const meetsScore = e.matchScore >= 65;
    return withinRadius && meetsScore;
  });
  console.log(`🎯 Visible in Client Feed: ${visibleInClient.length} of ${events.length} events.`);
  if (visibleInClient.length < events.length) {
    const hidden = events.filter((e) => !visibleInClient.includes(e));
    hidden.forEach((h) => {
      console.log(`   ❌ Hidden by client filter: "${h.title}" (Score: ${h.matchScore}%, Distance: ${h.distanceKm}km)`);
    });
  }
  console.log('');
}

runTest().catch((err) => {
  console.error('\n❌ Fatal Test Error:', err);
  process.exit(1);
});
