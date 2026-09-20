import FirecrawlApp from '@mendable/firecrawl-js';
import { ScrapedPageInput, ScoutEngineMode } from '@/types';
import { generateDiscoveryQueries } from './query-planner';
import { resolveHubPermalinks } from './hub-resolver';
import {
  FIRECRAWL_EVENT_LIST_SCHEMA,
  FIRECRAWL_EVENT_EXTRACTION_PROMPT,
} from './firecrawl-schema';
import { harvestImageCandidates } from '../images';

/**
 * Normalizes raw Firecrawl search items into typed ScrapedPageInput objects.
 * Handles deduplication, ogImage resolution, and markdown flyer fallback.
 */
export function normalizeScrapedPages(
  rawItems: any[],
  seenUrls: Set<string>
): ScrapedPageInput[] {
  const pages: ScrapedPageInput[] = [];

  for (const item of rawItems) {
    if (!item?.url || seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);

    const markdown = item.markdown || '';
    const rawHtml = item.rawHtml || item.html || '';

    // Harvest a ranked, de-junked, absolute candidate list (Layer 1)
    const imageCandidates = harvestImageCandidates({
      pageUrl: item.url,
      ogImage: item.metadata?.ogImage || item.metadata?.['og:image'],
      twitterImage: item.metadata?.twitterImage || item.metadata?.['twitter:image'],
      extractedImageUrl: item.json?.imageUrl,
      markdown,
    });

    // Keep legacy single-image field pointing at the top candidate
    const flyerImage = imageCandidates[0] || item.metadata?.image;

    pages.push({
      url: item.url,
      title: item.title || item.metadata?.title || 'Event Calendar Listing',
      markdown,
      rawHtml,
      ogImage: flyerImage,
      imageCandidates,
      ...(item.json ? { extractedJson: item.json } : {}),
    });
  }

  return pages;
}

export interface ScoutCrawlOptions {
  prompt: string;
  location: string;
  mode: ScoutEngineMode;
  firecrawlKey: string;
}

export interface ScoutCrawlResult {
  allScrapedPages: ScrapedPageInput[];
  queriesUsed: string[];
  vibeTags: string[];
}

/**
 * Executes either a fast single-pass crawl or deep multi-query crawl via Firecrawl.
 */
export async function executeScoutCrawl({
  prompt,
  location,
  mode,
  firecrawlKey,
}: ScoutCrawlOptions): Promise<ScoutCrawlResult> {
  const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });
  const seenUrls = new Set<string>();
  const allScrapedPages: ScrapedPageInput[] = [];
  let queriesUsed: string[] = [];
  let vibeTags: string[] = [];

  if (mode === 'fast') {
    // ⚡ Fast Scout Engine: Laser single-pass search without heavy LLM JSON schema
    const laserQuery = `${prompt} in ${location} events calendar`;
    queriesUsed = [laserQuery];

    console.log(`[ScoutEngine] ⚡ Fast single-pass search: "${laserQuery}"`);

    const searchRes = await firecrawl.search(laserQuery, {
      limit: 3,
      location,
      country: 'US',
      scrapeOptions: {
        formats: ['rawHtml', 'markdown'],
        onlyMainContent: true,
      },
    });

    const items = (searchRes as any)?.web || (searchRes as any)?.data || [];
    const normalized = normalizeScrapedPages(items, seenUrls);
    allScrapedPages.push(...normalized);
  } else {
    // 🔬 Deep Scout Engine: Multi-angle expansion + heavy LLM schemas + hub resolution
    const queryResult = await generateDiscoveryQueries(prompt, location);
    queriesUsed = queryResult.queries;
    vibeTags = queryResult.vibeTags;

    console.log(`[ScoutEngine] 🔬 Deep crawl angles:\n${queriesUsed.map((q, i) => `  ${i + 1}. ${q}`).join('\n')}`);

    const searchSettled = await Promise.allSettled(
      queriesUsed.map((q) =>
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

    for (const res of searchSettled) {
      if (res.status === 'fulfilled') {
        const items = (res.value as any)?.web || (res.value as any)?.data || [];
        const normalized = normalizeScrapedPages(items, seenUrls);
        allScrapedPages.push(...normalized);
      }
    }

    // Direct Calendar Hub & Venue permalink resolution
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
    } catch (hubErr: any) {
      console.warn('[ScoutEngine] Hub permalink resolution warning:', hubErr?.message || hubErr);
    }
  }

  console.log(`[ScoutEngine] 📄 Crawl complete: ${allScrapedPages.length} unique pages ingested.`);

  return {
    allScrapedPages,
    queriesUsed,
    vibeTags,
  };
}
