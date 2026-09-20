import dotenv from 'dotenv';
import { resolve } from 'path';
import FirecrawlApp from '@mendable/firecrawl-js';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const apiKey = process.env.FIRECRAWL_API_KEY;

if (!apiKey || apiKey.includes('your_firecrawl_api_key')) {
  console.error('❌ Error: FIRECRAWL_API_KEY is missing or using placeholder.');
  process.exit(1);
}

const firecrawl = new FirecrawlApp({ apiKey });

interface BenchmarkRun {
  name: string;
  durationMs: number;
  resultCount: number;
  totalChars: number;
  error?: string;
}

const formatMs = (ms: number) => `${ms.toFixed(0)}ms (${(ms / 1000).toFixed(2)}s)`;

async function measure<T>(label: string, fn: () => Promise<T>): Promise<{ res: T; ms: number }> {
  const start = performance.now();
  const res = await fn();
  const ms = performance.now() - start;
  return { res, ms };
}

async function runBenchmarks() {
  console.log('\n=============================================================');
  console.log('   🔥 SideDoor — Firecrawl Performance & Bottleneck Analysis');
  console.log('=============================================================\n');

  const query = 'indie rock shows Brooklyn this weekend events calendar';
  console.log(`Query under test: "${query}"\n`);

  const runs: BenchmarkRun[] = [];

  // --- Test 1: Search ONLY (no scrapeOptions, just metadata / URLs / snippets) ---
  console.log('⏱️  [Test 1] Running pure Search (limit: 4, NO scraping)...');
  try {
    const { res, ms } = await measure('pure-search', () =>
      firecrawl.search(query, {
        limit: 4,
        country: 'US',
        location: 'Brooklyn, NY',
      })
    );
    const items = (res as any)?.web || (res as any)?.data || [];
    runs.push({
      name: 'Pure Search (No Scrape, limit: 4)',
      durationMs: ms,
      resultCount: items.length,
      totalChars: items.reduce((acc: number, it: any) => acc + (it.description?.length || 0), 0),
    });
    console.log(`   -> Completed in ${formatMs(ms)} | Results: ${items.length}`);
  } catch (err: any) {
    console.error(`   -> Failed:`, err?.message || err);
  }

  // --- Test 2: Current Production Config (limit: 4, formats: ['rawHtml', 'markdown'], onlyMainContent: true) ---
  console.log('⏱️  [Test 2] Current Config (limit: 4, formats: [rawHtml, markdown], onlyMainContent: true)...');
  try {
    const { res, ms } = await measure('current-config', () =>
      firecrawl.search(query, {
        limit: 4,
        country: 'US',
        location: 'Brooklyn, NY',
        scrapeOptions: {
          formats: ['rawHtml', 'markdown'],
          onlyMainContent: true,
        },
      })
    );
    const items = (res as any)?.web || (res as any)?.data || [];
    const totalChars = items.reduce(
      (acc: number, it: any) => acc + (it.markdown?.length || 0) + (it.rawHtml?.length || 0),
      0
    );
    runs.push({
      name: 'Current: limit 4, rawHtml + markdown, onlyMainContent: true',
      durationMs: ms,
      resultCount: items.length,
      totalChars,
    });
    console.log(`   -> Completed in ${formatMs(ms)} | Results: ${items.length} | Payload: ${(totalChars / 1024).toFixed(1)} KB`);
  } catch (err: any) {
    console.error(`   -> Failed:`, err?.message || err);
  }

  // --- Test 3: Markdown ONLY (limit: 4, formats: ['markdown'], onlyMainContent: true) ---
  console.log('⏱️  [Test 3] Markdown ONLY (limit: 4, formats: [markdown], onlyMainContent: true)...');
  try {
    const { res, ms } = await measure('markdown-only-4', () =>
      firecrawl.search(query, {
        limit: 4,
        country: 'US',
        location: 'Brooklyn, NY',
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
        },
      })
    );
    const items = (res as any)?.web || (res as any)?.data || [];
    const totalChars = items.reduce((acc: number, it: any) => acc + (it.markdown?.length || 0), 0);
    runs.push({
      name: 'Markdown ONLY (limit: 4, onlyMainContent: true)',
      durationMs: ms,
      resultCount: items.length,
      totalChars,
    });
    console.log(`   -> Completed in ${formatMs(ms)} | Results: ${items.length} | Payload: ${(totalChars / 1024).toFixed(1)} KB`);
  } catch (err: any) {
    console.error(`   -> Failed:`, err?.message || err);
  }

  // --- Test 4: Reduced limit (limit: 3 vs limit: 4) with rawHtml + markdown ---
  console.log('⏱️  [Test 4] Limit 3 (formats: [rawHtml, markdown], onlyMainContent: true)...');
  try {
    const { res, ms } = await measure('limit-3', () =>
      firecrawl.search(query, {
        limit: 3,
        country: 'US',
        location: 'Brooklyn, NY',
        scrapeOptions: {
          formats: ['rawHtml', 'markdown'],
          onlyMainContent: true,
        },
      })
    );
    const items = (res as any)?.web || (res as any)?.data || [];
    const totalChars = items.reduce(
      (acc: number, it: any) => acc + (it.markdown?.length || 0) + (it.rawHtml?.length || 0),
      0
    );
    runs.push({
      name: 'Limit 3: rawHtml + markdown, onlyMainContent: true',
      durationMs: ms,
      resultCount: items.length,
      totalChars,
    });
    console.log(`   -> Completed in ${formatMs(ms)} | Results: ${items.length} | Payload: ${(totalChars / 1024).toFixed(1)} KB`);
  } catch (err: any) {
    console.error(`   -> Failed:`, err?.message || err);
  }

  // --- Test 5: Reduced limit (limit: 2) with rawHtml + markdown ---
  console.log('⏱️  [Test 5] Limit 2 (formats: [rawHtml, markdown], onlyMainContent: true)...');
  try {
    const { res, ms } = await measure('limit-2', () =>
      firecrawl.search(query, {
        limit: 2,
        country: 'US',
        location: 'Brooklyn, NY',
        scrapeOptions: {
          formats: ['rawHtml', 'markdown'],
          onlyMainContent: true,
        },
      })
    );
    const items = (res as any)?.web || (res as any)?.data || [];
    const totalChars = items.reduce(
      (acc: number, it: any) => acc + (it.markdown?.length || 0) + (it.rawHtml?.length || 0),
      0
    );
    runs.push({
      name: 'Limit 2: rawHtml + markdown, onlyMainContent: true',
      durationMs: ms,
      resultCount: items.length,
      totalChars,
    });
    console.log(`   -> Completed in ${formatMs(ms)} | Results: ${items.length} | Payload: ${(totalChars / 1024).toFixed(1)} KB`);
  } catch (err: any) {
    console.error(`   -> Failed:`, err?.message || err);
  }

  // --- Test 6: Check without onlyMainContent or without rawHtml ---
  console.log('⏱️  [Test 6] Limit 3 (formats: [markdown], onlyMainContent: true)...');
  try {
    const { res, ms } = await measure('limit-3-markdown-only', () =>
      firecrawl.search(query, {
        limit: 3,
        country: 'US',
        location: 'Brooklyn, NY',
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
        },
      })
    );
    const items = (res as any)?.web || (res as any)?.data || [];
    const totalChars = items.reduce((acc: number, it: any) => acc + (it.markdown?.length || 0), 0);
    runs.push({
      name: 'Limit 3: Markdown ONLY',
      durationMs: ms,
      resultCount: items.length,
      totalChars,
    });
    console.log(`   -> Completed in ${formatMs(ms)} | Results: ${items.length} | Payload: ${(totalChars / 1024).toFixed(1)} KB`);
  } catch (err: any) {
    console.error(`   -> Failed:`, err?.message || err);
  }

  console.log('\n=============================================================');
  console.log('   📊 Summary Table: Latency & Payload Comparison');
  console.log('=============================================================\n');
  console.table(
    runs.map((r) => ({
      Strategy: r.name,
      'Time (s)': (r.durationMs / 1000).toFixed(2),
      'Time (ms)': Math.round(r.durationMs),
      Results: r.resultCount,
      'Payload (KB)': (r.totalChars / 1024).toFixed(1),
    }))
  );
}

runBenchmarks();
