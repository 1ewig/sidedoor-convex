import { NextRequest, NextResponse } from 'next/server';
import { executeScoutCrawl } from '@/lib/discovery/scout-engine';
import { runHybridEventDiscovery } from '@/lib/discovery/pipeline';
import { Coordinates, ScoutEngineMode } from '@/types';

export async function POST(req: NextRequest) {
  const reqStart = Date.now();
  try {
    const body = await req.json();
    const prompt = body?.prompt?.trim();
    const location = body?.location?.trim() || 'Brooklyn / New York City';
    const userCoords = body?.coordinates as Coordinates | undefined;
    const mode = (body?.mode === 'deep' ? 'deep' : 'fast') as ScoutEngineMode;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'A search prompt is required.' },
        { status: 400 }
      );
    }

    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    const googleKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY;

    if (!firecrawlKey || firecrawlKey.includes('your_firecrawl_api_key')) {
      return NextResponse.json(
        {
          success: false,
          error: 'FIRECRAWL_API_KEY is not configured in .env.local.',
        },
        { status: 503 }
      );
    }

    if (!googleKey || googleKey.includes('your_google_api_key')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Gemini API Key is not configured in .env.local.',
        },
        { status: 503 }
      );
    }

    console.log(`\n[API /api/scout] === Scout Request [${mode.toUpperCase()}] "${prompt}" @ ${location} ===`);

    // 1. Crawl & Ingest Web Pages
    const { allScrapedPages, queriesUsed, vibeTags } = await executeScoutCrawl({
      prompt,
      location,
      mode,
      firecrawlKey,
    });

    if (allScrapedPages.length === 0) {
      return NextResponse.json({
        success: true,
        events: [],
        queries: queriesUsed,
        vibeTags,
        message: 'No web pages found matching query angles.',
      });
    }

    // 2. Run Deterministic Lane A + Deep Lane B + LLM Curator
    const discoveryResult = await runHybridEventDiscovery(
      allScrapedPages,
      prompt,
      location,
      userCoords
    );

    const elapsed = parseFloat(((Date.now() - reqStart) / 1000).toFixed(2));
    console.log(`[API /api/scout] ✅ Complete in ${elapsed}s: ${discoveryResult.events.length} events curated.`);

    return NextResponse.json({
      success: true,
      events: discoveryResult.events,
      stats: {
        ...discoveryResult.stats,
        scoutMode: mode,
        totalDurationSec: elapsed,
      },
      queries: queriesUsed,
      vibeTags,
      pagesScrapedCount: allScrapedPages.length,
    });
  } catch (err: any) {
    console.error('[API /api/scout] ❌ Scout API Pipeline Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Scout discovery pipeline failed.',
      },
      { status: 500 }
    );
  }
}
