import dotenv from 'dotenv';
import { resolve } from 'path';
import { executeScoutCrawl } from '../src/lib/discovery/scout-engine';
import { runHybridEventDiscovery } from '../src/lib/discovery/pipeline';
import { Coordinates } from '../src/types';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const firecrawlKey = process.env.FIRECRAWL_API_KEY;
if (!firecrawlKey) {
  throw new Error('Missing FIRECRAWL_API_KEY in environment');
}

async function benchmark() {
  const prompt = process.argv[2] || 'live jazz and intimate soul sessions in lower manhattan this weekend';
  const location = 'Lower Manhattan, New York';
  const userCoords: Coordinates = { lat: 40.7128, lng: -74.006 }; // NYC Lower Manhattan / City Hall

  console.log('======================================================');
  console.log('⚡ Benchmarking Full Scout Pipeline');
  console.log(`Prompt:   "${prompt}"`);
  console.log(`Location: "${location}"`);
  console.log('======================================================\n');

  const t0 = performance.now();

  // 1. Crawl stage
  console.log('[Step 1] Crawling & ingesting pages with Firecrawl...');
  const tCrawlStart = performance.now();
  const crawlResult = await executeScoutCrawl({
    prompt,
    location,
    firecrawlKey: firecrawlKey!,
    when: 'this weekend',
  });
  const tCrawl = ((performance.now() - tCrawlStart) / 1000).toFixed(2);
  console.log(`[Step 1 Done] Ingested ${crawlResult.allScrapedPages.length} pages in ${tCrawl}s`);
  console.log(`              Search query used: "${crawlResult.queriesUsed.join('", "')}"`);

  // 2. Discovery & Curation stage
  console.log('\n[Step 2] Extracting events, deduplicating, batch geocoding & curating with Gemini...');
  const tDiscoveryStart = performance.now();
  const discovery = await runHybridEventDiscovery(
    crawlResult.allScrapedPages,
    prompt,
    location,
    userCoords
  );
  const tDiscovery = ((performance.now() - tDiscoveryStart) / 1000).toFixed(2);
  const total = ((performance.now() - t0) / 1000).toFixed(2);

  console.log(`[Step 2 Done] Curated ${discovery.events.length} events in ${tDiscovery}s`);

  console.log('\n======================================================');
  console.log('📊 SCOUT TIMING BENCHMARK REPORT');
  console.log('======================================================');
  console.log(`Crawl Stage Duration:     ${tCrawl}s`);
  console.log(`Discovery Stage Duration: ${tDiscovery}s`);
  console.log(`Total End-to-End Elapsed: ${total}s`);
  console.log('------------------------------------------------------');

  console.log('\n📋 Curated Events:');
  for (let i = 0; i < discovery.events.length; i++) {
    const e = discovery.events[i];
    const distStr = e.distanceKm !== undefined ? `${e.distanceKm.toFixed(1)} km away` : 'No distance';
    console.log(`${i + 1}. [${e.category.toUpperCase()}] "${e.title}"`);
    console.log(`   Venue:    ${e.venueName} (${e.address || 'No address'})`);
    console.log(`   Time:     ${e.formattedDate} at ${e.formattedTime}`);
    console.log(`   Price:    ${e.price} (Free: ${e.isFree})`);
    console.log(`   Distance: ${distStr}`);
    console.log(`   Email:    ${e.organizerEmail}`);
    console.log(`   Score:    ${e.matchScore}`);
    console.log(`   Vibes:    ${e.vibeTags.join(' ')}`);
    console.log('');
  }
}

benchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
