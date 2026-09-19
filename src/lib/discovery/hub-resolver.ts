import FirecrawlApp from '@mendable/firecrawl-js';
import { ScrapedPageInput } from '@/types/discovery';
import {
  FIRECRAWL_SINGLE_EVENT_SCHEMA,
  FIRECRAWL_PERMALINK_EXTRACTION_PROMPT,
} from './firecrawl-schema';

/**
 * Known platforms and domain patterns that host calendar listings and direct event permalinks.
 */
const HUB_DOMAINS = [
  'ohmyrockness.com',
  'dice.fm',
  'ra.co',
  'lu.ma',
  'luma.com',
  'boweryballroom.com',
  'mercuryeastpresents.com',
  'brooklynbowl.com',
  'babyallight.com',
  'tveye.nyc',
  'market-hotel.org',
  'warsawconcerts.com',
  'brooklynmelt.com',
  'songkick.com',
  'bandsintown.com',
];

/**
 * Event permalink URL pattern: detects URLs that represent a specific gathering
 * rather than a top-level category or index.
 */
const EVENT_PERMALINK_REGEX =
  /\/(?:event|events|shows|tm-event|show|e)\/([a-zA-Z0-9_.-]+)/i;

const EXCLUDE_URL_REGEX =
  /\/(?:login|register|signin|signup|privacy|terms|about|contact|cart|checkout|checkout-tickets|venues|artists|genres|metros|faq|help|advertise|search)/i;

/**
 * Extracts the base origin or root domain from a URL.
 */
export function getDomainRoot(urlStr: string): string | null {
  try {
    const parsed = new URL(urlStr);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return null;
  }
}

/**
 * Identifies if a URL belongs to a known hub platform or appears to be a calendar index page.
 */
export function isCandidateHub(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();

    if (HUB_DOMAINS.some((d) => hostname.includes(d))) {
      return true;
    }

    // Check for calendar index paths on venue domains
    if (/\/(?:calendar|shows|events|schedule|lineup)$/i.test(parsed.pathname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Discovers and deep-scrapes individual event permalinks from calendar hubs via /map and parallel /scrape.
 *
 * Cost: 1 credit for /map + 1 credit per scraped permalink.
 * Limits: Max 1 hub domain per scout run, max 3 permalinks scraped.
 */
export async function resolveHubPermalinks(
  firecrawl: FirecrawlApp,
  discoveredUrls: string[],
  locationHint: string,
  existingUrls: Set<string>,
  maxPermalinks: number = 3
): Promise<ScrapedPageInput[]> {
  const candidateHubs = discoveredUrls.filter(isCandidateHub);
  if (candidateHubs.length === 0) return [];

  // Pick top candidate hub domain
  const targetHubUrl = candidateHubs[0];
  const rootDomain = getDomainRoot(targetHubUrl);
  if (!rootDomain) return [];

  console.log(`[HubResolver] 🎯 Detected high-signal hub: ${rootDomain}. Discovering permalinks via /map...`);

  try {
    const mapStart = Date.now();
    const mapResult = await firecrawl.mapUrl(rootDomain, {
      search: locationHint.split('/')[0].trim(),
      limit: 25,
    });

    const links: any[] = (mapResult as any)?.links || [];
    const mapElapsed = ((Date.now() - mapStart) / 1000).toFixed(2);
    console.log(`[HubResolver] Discovered ${links.length} URLs from ${rootDomain} in ${mapElapsed}s.`);

    // Filter for actual event permalinks
    const permalinks: string[] = [];
    for (const item of links) {
      const href = typeof item === 'string' ? item : item?.url;
      if (!href) continue;
      if (existingUrls.has(href)) continue;
      if (EXCLUDE_URL_REGEX.test(href)) continue;

      if (EVENT_PERMALINK_REGEX.test(href)) {
        permalinks.push(href);
        if (permalinks.length >= maxPermalinks) break;
      }
    }

    if (permalinks.length === 0) {
      console.log(`[HubResolver] No new event permalinks found on ${rootDomain}.`);
      return [];
    }

    console.log(`[HubResolver] Deep-scraping ${permalinks.length} permalinks:`, permalinks);

    const scrapeStart = Date.now();
    const settled = await Promise.allSettled(
      permalinks.map((url) =>
        firecrawl.scrapeUrl(url, {
          formats: [
            'markdown',
            'rawHtml',
            {
              type: 'json',
              schema: FIRECRAWL_SINGLE_EVENT_SCHEMA,
              prompt: FIRECRAWL_PERMALINK_EXTRACTION_PROMPT,
            },
          ],
          onlyMainContent: true,
        })
      )
    );

    const scrapeElapsed = ((Date.now() - scrapeStart) / 1000).toFixed(2);
    console.log(`[HubResolver] Scraped ${permalinks.length} permalinks in ${scrapeElapsed}s.`);

    const pages: ScrapedPageInput[] = [];

    settled.forEach((res, i) => {
      const url = permalinks[i];
      if (res.status === 'fulfilled') {
        const doc = res.value as any;
        const metadata = doc.metadata || {};
        const ogImage = metadata.ogImage || metadata['og:image'] || metadata.image;

        pages.push({
          url,
          title: metadata.title || metadata.ogTitle || 'Live Event',
          markdown: doc.markdown || '',
          rawHtml: doc.rawHtml || '',
          ogImage,
          extractedJson: doc.json || null,
        });
      } else {
        console.warn(`[HubResolver] Failed to scrape permalink ${url}:`, res.reason);
      }
    });

    return pages;
  } catch (err: any) {
    console.warn(`[HubResolver] Hub expansion failed for ${rootDomain}:`, err?.message || err);
    return [];
  }
}
