import dotenv from 'dotenv';
import { resolve } from 'path';
import FirecrawlApp from '@mendable/firecrawl-js';
import { generateDiscoveryQueries } from '../src/lib/discovery/query-planner';
import { runHybridEventDiscovery } from '../src/lib/discovery/pipeline';
import { getTemporalContext } from '../src/lib/temporal';
import { ScrapedPageInput } from '../src/types';
import {
  FIRECRAWL_EVENT_LIST_SCHEMA,
  FIRECRAWL_EVENT_EXTRACTION_PROMPT,
} from '../src/lib/discovery/firecrawl-schema';
import { resolveHubPermalinks } from '../src/lib/discovery/hub-resolver';

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

// Reference anchor coordinates for Brooklyn / NYC distance calculation
const USER_COORDS = { lat: 40.7128, lng: -73.95 };

// =============================================================================
// Live Discovery Test Harness: 100% Real Web Scraping & Multi-Lane Pipeline
// =============================================================================

async function runTest(): Promise<void> {
  const userPrompt =
    process.argv[2] ||
    'indie rock shows, outdoor night fleas, or art vernissages within 20 km of me this weekend';
  const location = process.argv[3] || 'Brooklyn / New York City';

  const { currentDateStr, weekendStr, monthYearStr } = getTemporalContext();

  console.log('\n======================================================');
  console.log('   🚦 SideDoor — Live Discovery Pipeline Test');
  console.log('      (100% Live Web Scraping & Production AI)');
  console.log('======================================================\n');
  console.log(`💬 User Request:     "${userPrompt}"`);
  console.log(`📍 Location Context: "${location}"`);
  console.log(`📅 Reference Date:   ${currentDateStr}`);
  console.log(`⏳ Target Weekend:   ${weekendStr} (${monthYearStr})\n`);

  const pipelineStart = Date.now();

  // STEP 1: Query generation via Gemini Flash
  console.log('[1/3] Generating multi-angle search queries via Gemini Flash...');
  const queryStart = Date.now();
  const queryResult = await generateDiscoveryQueries(userPrompt, location);
  const queryElapsed = ((Date.now() - queryStart) / 1000).toFixed(2);
  console.log(`✅ Generated ${queryResult.queries.length} targeted search angles in ${queryElapsed}s:`);
  queryResult.queries.forEach((q, idx) => {
    console.log(`   ${idx + 1}. "${q}"`);
  });
  console.log(`   🏷️  Extracted Vibe Tags: [${queryResult.vibeTags.join(', ')}]\n`);

  // STEP 2: Multi-query parallel crawl via Firecrawl (markdown + rawHtml + plain JSON schema)
  console.log('[2/3] Crawling web pages across all query angles in parallel...');
  const crawlStart = Date.now();
  const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });
  const searchSettled = await Promise.allSettled(
    queryResult.queries.map((q) =>
      firecrawl.search(q, {
        limit: 2,
        location,
        country: 'US',
        scrapeOptions: {
          formats: [
            'markdown',
            'rawHtml',
            {
              type: 'json',
              schema: FIRECRAWL_EVENT_LIST_SCHEMA,
              prompt: FIRECRAWL_EVENT_EXTRACTION_PROMPT,
            },
          ],
          onlyMainContent: true,
        },
      })
    )
  );

  const seenUrls = new Set<string>();
  const allScrapedPages: ScrapedPageInput[] = [];

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
          extractedJson: item.json || null,
        });
      }
    }
  }

  // Step 2B: Resolve calendar hub permalinks
  try {
    const hubPages = await resolveHubPermalinks(
      firecrawl,
      Array.from(seenUrls),
      location,
      seenUrls,
      3
    );
    for (const p of hubPages) {
      if (!seenUrls.has(p.url)) {
        seenUrls.add(p.url);
        allScrapedPages.push(p);
      }
    }
    if (hubPages.length > 0) {
      console.log(`✅ Augmented with ${hubPages.length} direct event permalinks from calendar hubs.`);
    }
  } catch (hubErr: any) {
    console.warn('⚠️ Hub permalink resolution warning:', hubErr?.message || hubErr);
  }

  const crawlElapsed = ((Date.now() - crawlStart) / 1000).toFixed(2);
  console.log(`✅ Crawled & deduplicated ${allScrapedPages.length} unique live web pages in ${crawlElapsed}s.\n`);

  if (allScrapedPages.length === 0) {
    console.warn('⚠️ No web pages were retrieved from the search queries.');
    return;
  }

  // STEP 3: Execute the production hybrid discovery pipeline
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
  console.log(`🎉 Live Pipeline Complete! (${events.length} Events Discovered in ${totalElapsed}s)`);
  console.log('======================================================');
  console.log(`📊 Pipeline Telemetry:`);
  console.log(`   - Input Live Scraped Pages: ${stats.pagesScrapedCount}`);
  console.log(`   - Structured Fast Lane:     ${stats.structuredCount} events parsed`);
  console.log(`   - Deep Fallback Lane:       ${stats.unstructuredCount} events parsed`);
  console.log(`   - Final Curated Events:     ${events.length}`);
  console.log(`   - Curator Processing Time:  ${stats.curationTimeSec}s`);
  console.log(`   - Total Pipeline Time:      ${totalElapsed}s\n`);

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
