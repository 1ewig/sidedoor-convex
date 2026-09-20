import FirecrawlApp from '@mendable/firecrawl-js';
import { ScrapedPageInput, ScoutEngineMode } from '@/types';
import { harvestImageCandidates } from '../images';

// ---------------------------------------------------------------------------
// Junk Page Filter
// ---------------------------------------------------------------------------

const JUNK_HOST_PREFIX = /^(business|legal|blog|careers|jobs|support|help)\./i;
const JUNK_PATH_SEGMENT =
  /^\/(about|about-us|jobs|careers|blog|news|terms|legal|privacy|business|company|contact|team|press|mission|how-it-works|faq)(\/|$)/i;
const JUNK_PHRASES =
  /terms and conditions|privacy policy|join our team|our story|careers at|jobs at|how it works|latest news/i;
const TICKET_CATEGORY_PORTAL =
  /ticketmaster\.com\/(soccer|sports|music|comedy|family|theater|arts|family)\/?(\?|$)/i;

export function isJunkPage(url: string, title?: string, snippet?: string): boolean {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, '').toLowerCase();
    const pathname = u.pathname.toLowerCase();

    if (JUNK_HOST_PREFIX.test(host)) return true;
    if (JUNK_PATH_SEGMENT.test(pathname)) return true;
    if (TICKET_CATEGORY_PORTAL.test(url)) return true;

    const fullText = `${title || ''} ${snippet || ''}`.toLowerCase();
    if (JUNK_PHRASES.test(fullText) && fullText.length < 200) return true;
  } catch {
    return false;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Scraped Page Normalization
// ---------------------------------------------------------------------------

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
  mode?: ScoutEngineMode;
  firecrawlKey: string;
  country?: string;
  when?: string;
}

export interface ScoutCrawlResult {
  allScrapedPages: ScrapedPageInput[];
  queriesUsed: string[];
  vibeTags: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
 * Executes bare-minimum fast single-pass search via Firecrawl.
 */
export async function executeScoutCrawl({
  prompt,
  location,
  firecrawlKey,
  country,
  when,
}: ScoutCrawlOptions): Promise<ScoutCrawlResult> {
  const firecrawl = new FirecrawlApp({ apiKey: firecrawlKey });
  const seenUrls = new Set<string>();
  const allScrapedPages: ScrapedPageInput[] = [];

  const targetCountry = country || process.env.FIRECRAWL_COUNTRY || 'US';
  const timeSuffix = when && when !== 'anytime' ? ` ${when}` : '';

  const laserQuery = `${prompt} in ${location} events calendar${timeSuffix}`;
  const queriesUsed = [laserQuery];

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

  console.log(`[ScoutEngine] 📄 Crawl complete: ${allScrapedPages.length} unique pages ingested.`);

  return {
    allScrapedPages,
    queriesUsed,
    vibeTags: [],
  };
}
