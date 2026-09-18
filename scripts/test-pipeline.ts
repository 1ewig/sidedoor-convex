import dotenv from 'dotenv';
import { resolve } from 'path';
import FirecrawlApp from '@mendable/firecrawl-js';
import { generateDiscoveryQueries, extractEventsFromMarkdown } from '../src/lib/ai';

// Load environment
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const firecrawlKey = process.env.FIRECRAWL_API_KEY;

async function main() {
  console.log('\n======================================================');
  console.log('   🚀 SideDoor — Complete 3-Step Discovery Pipeline');
  console.log('      (Gemini 3.5 Flash Lite + Firecrawl + UI Events)');
  console.log('======================================================\n');

  const userPrompt =
    process.argv[2] ||
    'indie rock shows, outdoor night fleas, or art vernissages within 20 km of me this weekend';
  const location = 'Brooklyn / NYC';

  console.log(`💬 User Request: "${userPrompt}"\n`);

  // STEP 1: Generate 3 Queries
  console.log(`[Step 1/3] Generating 3 targeted queries with Gemini 3.5 Flash Lite...`);
  const queryResult = await generateDiscoveryQueries(userPrompt, location);
  queryResult.queries.forEach((q, i) => {
    console.log(`   Query ${i + 1}: "${q}"`);
  });

  // STEP 2: Firecrawl Search & Scrape
  console.log(`\n[Step 2/3] Crawling web with Firecrawl for Query 1: "${queryResult.queries[0]}"...`);
  const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });
  
  const searchStart = Date.now();
  const searchResponse = await firecrawl.search(queryResult.queries[0]!, {
    limit: 2,
    scrapeOptions: { formats: ['markdown'] },
  });
  const searchElapsed = ((Date.now() - searchStart) / 1000).toFixed(2);

  const webResults = (searchResponse as any)?.web || [];
  console.log(`✅ Firecrawl scraped ${webResults.length} pages in ${searchElapsed}s!`);

  if (webResults.length === 0) {
    console.log('No web results found for query 1.');
    return;
  }

  // STEP 3: Structured LocalEvent Extraction for UI
  console.log(`\n[Step 3/3] Extracting structured LocalEvent[] for UI using Gemini 3.5 Flash Lite...`);
  const extractStart = Date.now();

  const events = await extractEventsFromMarkdown(
    webResults.map((r: any) => ({
      url: r.url,
      title: r.title,
      markdown: r.markdown,
    })),
    userPrompt,
    location
  );

  const extractElapsed = ((Date.now() - extractStart) / 1000).toFixed(2);
  console.log(`✅ Formatted ${events.length} UI-ready LocalEvent objects in ${extractElapsed}s!\n`);

  events.forEach((evt, i) => {
    console.log(`--- [UI Event #${i + 1}] --------------------------------`);
    console.log(`🆔 ID:         ${evt.id}`);
    console.log(`📌 Title:      ${evt.title}`);
    console.log(`🏷️ Category:   ${evt.category.toUpperCase()}`);
    console.log(`📍 Venue:      ${evt.venueName}`);
    console.log(`🏠 Address:    ${evt.address} (${evt.distanceKm} km away)`);
    console.log(`🌐 Coords:     ${evt.coordinates.lat}, ${evt.coordinates.lng}`);
    console.log(`🕒 Time:       ${evt.formattedDate} • ${evt.formattedTime}`);
    console.log(`🎟️ Price:      ${evt.price} (Free: ${evt.isFree})`);
    console.log(`✨ Score:      ${evt.matchScore}% Vibe Match`);
    console.log(`🏷️ Tags:       ${evt.vibeTags.join(' ')}`);
    console.log(`✉️ Organizer:  ${evt.organizerName} <${evt.organizerEmail}>`);
    console.log(`🖼️ Photo:      ${evt.coverImage || '(None extracted)'}`);
    console.log(`📝 Tagline:    "${evt.tagline}"`);
    console.log(`📖 Overview:   "${evt.description}"\n`);
  });

  console.log('======================================================');
  console.log('🎉 Step 3 Completed: UI-Ready LocalEvent[] Generated!');
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('❌ Pipeline Error:', err);
});
