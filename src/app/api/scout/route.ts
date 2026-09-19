import { NextRequest, NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { generateDiscoveryQueries } from '@/lib/discovery/query-planner';
import { runHybridEventDiscovery } from '@/lib/discovery/pipeline';
import { Coordinates, ScrapedPageInput } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body?.prompt?.trim();
    const location = body?.location?.trim() || 'Brooklyn / New York City';
    const userCoords = body?.coordinates as Coordinates | undefined;

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
          error: 'FIRECRAWL_API_KEY is not configured or is a placeholder in .env.local.',
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

    // STEP 1: Query generation via Gemini Flash
    const queryResult = await generateDiscoveryQueries(prompt, location);

    // STEP 2: Multi-query parallel crawl via Firecrawl (requesting 'markdown' + 'rawHtml' for Schema.org JSON-LD)
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

    if (allScrapedPages.length === 0) {
      return NextResponse.json({
        success: true,
        events: [],
        queries: queryResult.queries,
        vibeTags: queryResult.vibeTags,
        message: 'No web pages found matching query angles.',
      });
    }

    // STEP 3: Two-Lane Hybrid Discovery (Deterministic Lane A + Deep Lane B + Semantic Curator)
    const discoveryResult = await runHybridEventDiscovery(
      allScrapedPages,
      prompt,
      location,
      userCoords
    );

    return NextResponse.json({
      success: true,
      events: discoveryResult.events,
      stats: discoveryResult.stats,
      queries: queryResult.queries,
      vibeTags: queryResult.vibeTags,
      pagesScrapedCount: allScrapedPages.length,
    });
  } catch (err: any) {
    console.error('Scout API Pipeline Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Scout discovery pipeline failed.',
      },
      { status: 500 }
    );
  }
}
