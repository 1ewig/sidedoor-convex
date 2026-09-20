import FirecrawlApp from '@mendable/firecrawl-js';
import { ScrapedPageInput, ScoutEngineMode } from '@/types';
import { generateDiscoveryQueries } from './query-planner';
import { resolveHubPermalinks } from './hub-resolver';
import {
  FIRECRAWL_EVENT_LIST_SCHEMA,
  FIRECRAWL_EVENT_EXTRACTION_PROMPT,
} from './firecrawl-schema';
import { harvestImageCandidates } from '../images';
import { isJunkPage } from './mining';

/**
 * Normalizes raw Firecrawl search items into typed ScrapedPageInput objects.
 * Handles deduplication, junk page filtering, ogImage resolution, and markdown flyer fallback.
 */
export function normalizeScrapedPages(
  rawItems: any[],
  seenUrls: Set<string>
): ScrapedPageInput[] {
  const pages: ScrapedPageInput[] = [];

  for (const item of rawItems) {
    if (!item?.url || seenUrls.has(item.url)) continue;
    
    const title = item.title || item.metadata?.title || 'Event Calendar Listing';
    const markdown = item.markdown || '';
    const rawHtml = item.rawHtml || item.html || '';

    // Filter out low-value utility / junk pages deterministically
    if (isJunkPage(item.url, title, markdown.slice(0, 300))) {
      continue;
    }

    seenUrls.add(item.url);

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
      title,
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
  country?: string;
  when?: string;
}

export interface ScoutCrawlResult {
  allScrapedPages: ScrapedPageInput[];
  queriesUsed: string[];
  vibeTags: string[];
}

/** Helper for sleep */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Executes a resilient search via Firecrawl with 429 backoff retry.
 */
async function searchWithBackoff(
  firecrawl: FirecrawlApp,
  query: string,
  options: any,
  maxRetries = 2
): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await firecrawl.search(query, options);
    } catch (err: any) {
      const msg = String(err?.message || err);
      const isRetryable = msg.includes('429') || msg.includes('rate limit') || msg.includes('500');
      if (attempt === maxRetries || !isRetryable) throw err;
      const waitMs = 1500 * 2 ** attempt + Math.random() * 500;
      console.warn(`[ScoutEngine] ⚠️ Firecrawl search hit ${msg}, retrying in ${Math.round(waitMs)}ms...`);
      await sleep(waitMs);
    }
  }
}

/**
 * Executes either a fast single-pass crawl or deep multi-query crawl via Firecrawl.
 */
export async function executeScoutCrawl({
  prompt,
  location,
  mode,
  firecrawlKey,
  country,
  when,
}: ScoutCrawlOptions): Promise<ScoutCrawlResult> {
  const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });
  const seenUrls = new Set<string>();
  const allScrapedPages: ScrapedPageInput[] = [];
  let queriesUsed: string[] = [];
  let vibeTags: string[] = [];

  const targetCountry = country || process.env.FIRECRAWL_COUNTRY || 'US';
  const timeSuffix = when && when !== 'anytime' ? ` ${when}` : '';

  if (mode === 'fast') {
    // ⚡ Fast Scout Engine: Laser single-pass search without heavy LLM JSON schema
    const laserQuery = `${prompt} in ${location} events calendar${timeSuffix}`;
    queriesUsed = [laserQuery];

    console.log(
      `[ScoutEngine] ⚡ Fast single-pass search: "${laserQuery}" [Country: ${targetCountry}]`
    );

    const searchRes = await searchWithBackoff(firecrawl, laserQuery, {
      limit: 4,
      location,
      country: targetCountry,
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

    console.log(
      `[ScoutEngine] 🔬 Deep crawl angles [Country: ${targetCountry}]:\n${queriesUsed
        .map((q, i) => `  ${i + 1}. ${q}${timeSuffix}`)
        .join('\n')}`
    );

    const searchSettled = await Promise.allSettled(
      queriesUsed.map((q) =>
        firecrawl.search(timeSuffix ? `${q}${timeSuffix}` : q, {
          limit: 2,
          location,
          country: targetCountry,
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
