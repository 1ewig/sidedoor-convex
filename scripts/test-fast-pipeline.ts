import dotenv from 'dotenv';
import { resolve } from 'path';
import FirecrawlApp from '@mendable/firecrawl-js';
import { extractStructuredEventsFromHtml } from '../src/lib/schema-org';
import { curateCandidatesWithLLM, extractFromUnstructuredMarkdown } from '../src/lib/discovery';
import { getTemporalContext } from '../src/lib/temporal';
import { CandidateEvent, ScrapedPageInput } from '../src/types/discovery';
import { LocalEvent } from '../src/types';

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

const USER_COORDS = { lat: 40.7128, lng: -73.95 };

async function runFastTest() {
  const userPrompt =
    process.argv[2] ||
    'indie rock shows, outdoor night fleas, or art vernissages this weekend';
  const location = process.argv[3] || 'Brooklyn / New York City';

  const { currentDateStr, weekendStr, monthYearStr, targetWeekendRange } = getTemporalContext();

  console.log('\n======================================================');
  console.log('   ⚡ SideDoor — Fast Scout Pipeline Test');
  console.log('      (Single-Pass Live Scraping + Lane A + Fast Curator)');
  console.log('======================================================\n');
  console.log(`💬 User Request:     "${userPrompt}"`);
  console.log(`📍 Location Context: "${location}"`);
  console.log(`📅 Reference Date:   ${currentDateStr}`);
  console.log(`⏳ Target Weekend:   ${weekendStr} (${monthYearStr})\n`);

  const pipelineStart = performance.now();

  // 1. Construct single targeted query (zero LLM latency on query planning)
  const searchQuery = `${userPrompt} in ${location} events calendar`;
  console.log(`[1/3] 🎯 Laser Query: "${searchQuery}"`);

  // 2. Firecrawl Single-Pass Search without heavy LLM JSON schema
  console.log('[2/3] 🌐 Scraping web results (rawHtml + markdown, no LLM schema)...');
  const crawlStart = performance.now();
  const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });

  const searchRes = await firecrawl.search(searchQuery, {
    limit: 3,
    location,
    country: 'US',
    scrapeOptions: {
      formats: ['rawHtml', 'markdown'],
      onlyMainContent: true,
    },
  });

  const crawlElapsed = ((performance.now() - crawlStart) / 1000).toFixed(2);
  const items = (searchRes as any)?.web || (searchRes as any)?.data || [];
  console.log(`✅ Firecrawl returned ${items.length} pages in ${crawlElapsed}s.`);

  // 3. Lane A: Deterministic JSON-LD extraction
  console.log('[3/3] ⚡ Parsing Lane A (JSON-LD) & Curating with Gemini Flash...');
  const laneAStart = performance.now();
  const candidates: CandidateEvent[] = [];

  for (const item of items) {
    const rawHtml = item.rawHtml || item.html || '';
    const ogImage =
      item.metadata?.ogImage ||
      item.metadata?.['og:image'] ||
      item.metadata?.image;

    const extracted = extractStructuredEventsFromHtml(rawHtml, item.url, ogImage, {
      weekendStart: targetWeekendRange.start,
      weekendEnd: targetWeekendRange.end,
    });

    candidates.push(...extracted);
  }

  const laneAElapsed = ((performance.now() - laneAStart) / 1000).toFixed(3);
  console.log(`✅ Lane A parsed ${candidates.length} structured events in ${laneAElapsed}s.`);

  // If Lane A produced candidates, curate with Gemini Flash
  let curatedEvents: LocalEvent[] = [];
  const curatorStart = performance.now();

  if (candidates.length > 0) {
    curatedEvents = await curateCandidatesWithLLM(
      candidates.slice(0, 10),
      userPrompt,
      USER_COORDS
    );
  } else {
    console.log('⚠️ Lane A had 0 events, testing fallback extraction on top page markdown...');
    // Quick fallback on the first page markdown if no JSON-LD found
    const scrapedPages: ScrapedPageInput[] = items.slice(0, 2).map((it: any) => ({
      url: it.url,
      title: it.title || 'Event Calendar',
      markdown: it.markdown || '',
      rawHtml: it.rawHtml || '',
      ogImage: it.metadata?.ogImage,
    }));
    const fallbackCandidates = await extractFromUnstructuredMarkdown(
      scrapedPages,
      userPrompt,
      location
    );
    curatedEvents = await curateCandidatesWithLLM(
      fallbackCandidates.slice(0, 10),
      userPrompt,
      USER_COORDS
    );
  }

  const curatorElapsed = ((performance.now() - curatorStart) / 1000).toFixed(2);
  const totalElapsed = ((performance.now() - pipelineStart) / 1000).toFixed(2);

  console.log(`✅ Gemini Curator completed in ${curatorElapsed}s.`);
  console.log('\n======================================================');
  console.log(`🎉 Fast Pipeline Finished in ${totalElapsed}s! (${curatedEvents.length} Events Curated)`);
  console.log('======================================================\n');

  curatedEvents.forEach((evt, i) => {
    console.log(`--- [Event #${i + 1}] ${evt.title} ---------------------`);
    console.log(`🏷️  Category:     ${evt.category.toUpperCase()}`);
    console.log(`✨  Match Score:  ${evt.matchScore}% | Tagline: "${evt.tagline}"`);
    console.log(`📍  Venue:        ${evt.venueName} (${evt.address})`);
    console.log(`🕒  Date & Time:  ${evt.formattedDate} • ${evt.formattedTime}`);
    console.log(`🎟️  Admission:    ${evt.price} (isFree: ${evt.isFree})`);
    console.log(`🏷️  Vibe Tags:    ${evt.vibeTags.join(' ')}`);
    console.log(`🖼️  Flyer Image:  ${evt.coverImage || 'None'}`);
    console.log(`✉️  AgentMail:    ${evt.organizerName} <${evt.organizerEmail}>`);
    console.log(`🔗  Source:       ${evt.sourceUrl}`);
    console.log(`📝  Overview:     "${evt.description}"\n`);
  });
}

runFastTest().catch((err) => {
  console.error('❌ Fast Pipeline Error:', err);
  process.exit(1);
});
