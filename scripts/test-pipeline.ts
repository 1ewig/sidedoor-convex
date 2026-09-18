import dotenv from 'dotenv';
import { resolve } from 'path';
import FirecrawlApp from '@mendable/firecrawl-js';
import {
  generateDiscoveryQueries,
  extractEventsFromMarkdown,
  getTemporalContext,
  ScrapedPageInput,
} from '../src/lib/ai';
import { calculateHaversineDistanceKm } from '../src/lib/geo';

// Load environment
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const firecrawlKey = process.env.FIRECRAWL_API_KEY;
const googleKey =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GEMINI_API_KEY;

async function main() {
  console.log('\n======================================================');
  console.log('   🚀 SideDoor — Autonomous Multi-Query Event Scout');
  console.log('      (Gemini 3.5 Flash Lite + Firecrawl + UI Engine)');
  console.log('======================================================\n');

  // Pre-flight credentials verification
  if (!firecrawlKey || firecrawlKey.includes('your_firecrawl_api_key')) {
    console.error('❌ Error: FIRECRAWL_API_KEY is missing or invalid in .env.local.');
    console.error('   Please add a valid key from https://firecrawl.dev');
    process.exit(1);
  }

  if (!googleKey || googleKey.includes('your_google_api_key')) {
    console.error('❌ Error: GOOGLE_GENERATIVE_AI_API_KEY is missing in .env.local.');
    console.error('   Please add a valid Gemini API key.');
    process.exit(1);
  }

  const userPrompt =
    process.argv[2] ||
    'indie rock shows, outdoor night fleas, or art vernissages within 20 km of me this weekend';
  const location = process.argv[3] || 'Brooklyn / New York City';

  const { currentDateStr, weekendStr, monthYearStr } = getTemporalContext();

  console.log(`💬 User Request:     "${userPrompt}"`);
  console.log(`📍 Location Context: "${location}"`);
  console.log(`📅 Reference Date:   ${currentDateStr}`);
  console.log(`⏳ Target Weekend:   ${weekendStr} (${monthYearStr})\n`);

  const pipelineStart = Date.now();

  // =========================================================================
  // STEP 1: Generate 3 Distinct Query Angles
  // =========================================================================
  console.log(`[Step 1/3] Generating 3 multi-angle search queries with Gemini 3.5 Flash Lite...`);
  const step1Start = Date.now();
  const queryResult = await generateDiscoveryQueries(userPrompt, location);
  const step1Elapsed = ((Date.now() - step1Start) / 1000).toFixed(2);

  console.log(`✅ Generated 3 targeted queries in ${step1Elapsed}s:`);
  queryResult.queries.forEach((q, i) => {
    console.log(`   ${i + 1}. "${q}"`);
  });
  console.log(`🏷️ Tags: [ ${queryResult.vibeTags.join(', ')} ]`);
  console.log(`🧠 Intent Rationale: "${queryResult.reasoning}"\n`);

  // =========================================================================
  // STEP 2: Concurrent Multi-Query Firecrawl Search & Scrape
  // =========================================================================
  console.log(`[Step 2/3] Concurrently crawling all 3 query angles via Firecrawl...`);
  const step2Start = Date.now();
  const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });

  // Dispatch all 3 queries in parallel
  const searchSettled = await Promise.allSettled(
    queryResult.queries.map((query, index) =>
      firecrawl
        .search(query, {
          limit: 2,
          scrapeOptions: { formats: ['markdown'] },
        })
        .then((res) => ({ queryIndex: index + 1, query, res }))
    )
  );

  const step2Elapsed = ((Date.now() - step2Start) / 1000).toFixed(2);

  // Collate and deduplicate scraped pages
  const seenUrls = new Set<string>();
  const allScrapedPages: ScrapedPageInput[] = [];

  searchSettled.forEach((result, idx) => {
    const queryNum = idx + 1;
    if (result.status === 'fulfilled') {
      const { query, res } = result.value;
      const items = (res as any)?.web || (res as any)?.data || [];
      console.log(`   • Query ${queryNum} ("${query.slice(0, 45)}..."): ${items.length} pages found`);

      for (const item of items) {
        if (!item.url || seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);

        const markdown = item.markdown || '';
        // Extract OpenGraph image or first flyer image from markdown
        const ogImage =
          item.metadata?.ogImage ||
          item.metadata?.['og:image'] ||
          item.metadata?.image;

        let flyerImage = ogImage;
        if (!flyerImage) {
          const mdImgMatch = markdown.match(/!\[.*?\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp|avif)[^\s)]*)\)/i);
          if (mdImgMatch) flyerImage = mdImgMatch[1];
        }

        allScrapedPages.push({
          url: item.url,
          title: item.title || item.metadata?.title || 'Event Calendar Listing',
          markdown,
          ogImage: flyerImage,
        });
      }
    } else {
      console.warn(`   ⚠️ Query ${queryNum} failed:`, result.reason?.message || result.reason);
    }
  });

  console.log(`\n✅ Firecrawl gathered ${allScrapedPages.length} unique pages across 3 angles in ${step2Elapsed}s!`);

  if (allScrapedPages.length === 0) {
    console.error('❌ No web results discovered across queries. Aborting.');
    return;
  }

  // =========================================================================
  // STEP 3: Structured LocalEvent Extraction for UI
  // =========================================================================
  console.log(`\n[Step 3/3] Parsing structured LocalEvent[] via Gemini 3.5 Flash Lite...`);
  const step3Start = Date.now();

  const events = await extractEventsFromMarkdown(
    allScrapedPages,
    userPrompt,
    location
  );

  const step3Elapsed = ((Date.now() - step3Start) / 1000).toFixed(2);
  const totalElapsed = ((Date.now() - pipelineStart) / 1000).toFixed(2);

  console.log(`✅ Extracted ${events.length} verified LocalEvents in ${step3Elapsed}s! (Total: ${totalElapsed}s)\n`);

  events.forEach((evt, i) => {
    console.log(`======================================================`);
    console.log(`🎪 [UI Event #${i + 1}] ${evt.title}`);
    console.log(`======================================================`);
    console.log(`🆔 ID:         ${evt.id}`);
    const refLat = 40.7128;
    const refLng = -73.9500;
    const exactDist = calculateHaversineDistanceKm(refLat, refLng, evt.coordinates.lat, evt.coordinates.lng);

    console.log(`🏷️ Category:   ${evt.category.toUpperCase()}`);
    console.log(`📍 Venue:      ${evt.venueName}`);
    console.log(`🏠 Address:    ${evt.address} (${exactDist} km away [Haversine])`);
    console.log(`🌐 Coords:     ${evt.coordinates.lat}, ${evt.coordinates.lng}`);
    console.log(`🕒 Time:       ${evt.formattedDate} • ${evt.formattedTime}`);
    console.log(`📅 ISO Stamp:  ${evt.dateTime}`);
    console.log(`🎟️ Price:      ${evt.price} (Free: ${evt.isFree})`);
    console.log(`✨ Score:      ${evt.matchScore}% Vibe Match`);
    console.log(`🏷️ Tags:       ${evt.vibeTags.join(' ')}`);
    console.log(`✉️ Organizer:  ${evt.organizerName} <${evt.organizerEmail}>`);
    console.log(`🔗 Source:     ${evt.sourceUrl}`);
    console.log(`🖼️ Flyer Photo: ${evt.coverImage || '(None extracted)'}`);
    console.log(`📝 Tagline:    "${evt.tagline}"`);
    console.log(`📖 Overview:   "${evt.description}"\n`);
  });

  console.log('======================================================');
  console.log(`🎉 Pipeline Succeeded! Discovered ${events.length} UI-Ready Events in ${totalElapsed}s.`);
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('❌ Pipeline Fatal Error:', err);
  process.exit(1);
});
