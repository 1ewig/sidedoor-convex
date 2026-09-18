import dotenv from 'dotenv';
import { resolve } from 'path';
import FirecrawlApp from '@mendable/firecrawl-js';

// Load .env and .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const apiKey = process.env.FIRECRAWL_API_KEY;

async function main() {
  console.log('\n======================================================');
  console.log('   🔥 SideDoor — Firecrawl Local Integration Test');
  console.log('======================================================\n');

  if (!apiKey || apiKey.includes('your_firecrawl_api_key')) {
    console.error('❌ Error: FIRECRAWL_API_KEY is missing or using placeholder.');
    process.exit(1);
  }

  const app = new FirecrawlApp({ apiKey });

  const query = process.argv[2] || 'indie rock shows DIY concerts Brooklyn this weekend';
  console.log(`🔍 [1/3] Testing Web Search & Scrape for events...`);
  console.log(`   Query: "${query}"\n`);

  const startTime = Date.now();

  try {
    // 1. Search test
    const searchResponse = await app.search(query, {
      limit: 3,
      scrapeOptions: {
        formats: ['markdown'],
      },
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Search completed in ${elapsed}s!`);

    // In v4 SDK, search results are in .web
    const results = (searchResponse as any)?.web || (searchResponse as any)?.data || [];
    console.log(`\n📦 Discovered ${results.length} Web Results:\n`);

    results.forEach((item: any, idx: number) => {
      console.log(`--- [Result #${idx + 1}] --------------------------------`);
      console.log(`📌 Title:       ${item.title || item.metadata?.title || 'Untitled'}`);
      console.log(`🔗 URL:         ${item.url}`);
      console.log(`📝 Description: ${item.description || item.metadata?.description || 'N/A'}`);
      
      const markdown = item.markdown || '';
      const snippet = markdown.slice(0, 240).replace(/\n+/g, ' ');
      if (snippet) {
        console.log(`📄 Markdown:    "${snippet}..."`);
        console.log(`📊 Length:      ${markdown.length} characters\n`);
      } else {
        console.log(`📄 Markdown:    (No markdown stream)\n`);
      }
    });

    // 2. Direct Scrape Test
    const targetUrl = results[0]?.url || 'https://www.boweryballroom.com';
    console.log(`🔍 [2/3] Testing Direct Scrape on: ${targetUrl}`);

    const scrapeStart = Date.now();
    const scrapeDoc = await app.scrapeUrl(targetUrl, {
      formats: ['markdown'],
    });

    const scrapeElapsed = ((Date.now() - scrapeStart) / 1000).toFixed(2);
    const docMarkdown = (scrapeDoc as any)?.markdown || '';
    console.log(`✅ Scraped successfully in ${scrapeElapsed}s!`);
    console.log(`📄 Extracted Markdown Length: ${docMarkdown.length} characters`);
    console.log(`📄 Markdown Snippet: "${docMarkdown.slice(0, 200).replace(/\n+/g, ' ')}..."\n`);

    // 3. Map Test (Site URL Discovery)
    console.log(`🔍 [3/3] Testing Site URL Mapping on: ${targetUrl}`);
    const mapStart = Date.now();
    const mapData = await app.mapUrl(targetUrl, {
      limit: 5,
    });

    const mapElapsed = ((Date.now() - mapStart) / 1000).toFixed(2);
    const links = (mapData as any)?.links || [];
    console.log(`✅ Discovered ${links.length} internal links in ${mapElapsed}s:`);
    links.slice(0, 5).forEach((link: any) => {
      const href = typeof link === 'string' ? link : link?.url || JSON.stringify(link);
      console.log(`   • ${href}`);
    });

    console.log('\n======================================================');
    console.log('🎉 Firecrawl Local Integration Test Passed Completely!');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('\n❌ Firecrawl Execution Error:', err.message || err);
  }
}

main();
