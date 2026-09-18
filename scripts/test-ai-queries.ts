import dotenv from 'dotenv';
import { resolve } from 'path';
import { generateDiscoveryQueries } from '../src/lib/ai';

// Load .env.local and .env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function main() {
  console.log('\n======================================================');
  console.log('   🤖 SideDoor — Vercel AI SDK + Google Gemini Test');
  console.log('======================================================\n');

  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.includes('your_google_api_key')) {
    console.error('❌ Error: GOOGLE_GENERATIVE_AI_API_KEY is missing or placeholder.');
    console.log('\n👉 Instructions:');
    console.log('1. Add your Google Gemini API key to .env.local:');
    console.log('   GOOGLE_GENERATIVE_AI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxx');
    console.log('2. Re-run:');
    console.log('   bun run test:ai\n');
    process.exit(1);
  }

  const prompt =
    process.argv[2] ||
    'indie rock shows, outdoor night fleas, or art vernissages within 20 km of me this weekend';
  const location = process.argv[3] || 'Brooklyn / New York City';

  console.log(`💬 User Prompt: "${prompt}"`);
  console.log(`📍 Location:    "${location}"\n`);
  console.log(`⏳ Generating 3 targeted Firecrawl search queries with Gemini 3.5 Flash Lite...`);

  const startTime = Date.now();

  try {
    const result = await generateDiscoveryQueries(prompt, location);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Generated in ${elapsed}s!\n`);
    console.log('📋 3 Firecrawl Queries:');
    result.queries.forEach((q, i) => {
      console.log(`   ${i + 1}. "${q}"`);
    });

    console.log('\n🏷️ Vibe Tags:');
    console.log(`   ${result.vibeTags.join('  ')}`);

    console.log('\n🧠 Planner Rationale:');
    console.log(`   ${result.reasoning}`);

    console.log('\n======================================================');
    console.log('🎉 LLM Query Generation Succeeded!');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('\n❌ AI Query Generation Failed:', err.message || err);
  }
}

main();
