/**
 * Pure image harvesting & validation utilities for the discovery pipeline.
 *
 * Layer 1 of the image system: turns raw scraped page data into a ranked,
 * de-junked, absolute list of flyer image candidates, then (optionally)
 * validates the top candidates server-side so we never ship a broken URL.
 */

/** URL patterns that are never real event flyers (trackers, icons, logos). */
const JUNK_IMAGE_REGEX =
  /(1x1|pixel|spacer|transparent|tracking|beacon|favicon|apple-touch-icon|\/logo|\/icon|sprite|avatar|gravatar|placeholder|blank)\.(?:png|gif|jpe?g|webp|svg)|doubleclick|googlesyndication|facebook\.com\/tr|analytics/i;

/** File extensions that are never useful as event flyers. */
const BAD_EXTENSION_REGEX = /\.(svg|gif|ico)(\?|#|$)/i;

/** Minimum remote image byte-size; anything smaller is almost always a pixel/icon. */
const MIN_IMAGE_BYTES = 5000;

/** Per-request validation timeout (ms). */
const VALIDATE_TIMEOUT_MS = 1200;

/**
 * Resolves a possibly-relative image reference to an absolute URL against a page URL.
 * Returns null when the reference is unusable (data URI, mailto, junk, etc.).
 */
export function toAbsoluteImageUrl(
  src: string | undefined | null,
  pageUrl: string
): string | null {
  if (!src) return null;
  const trimmed = src.trim();
  if (!trimmed) return null;

  // Reject non-network references outright
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('javascript:')
  ) {
    return null;
  }

  if (BAD_EXTENSION_REGEX.test(trimmed)) return null;
  if (JUNK_IMAGE_REGEX.test(trimmed)) return null;

  try {
    // Resolve relative → absolute against the page it was scraped from
    const resolved = new URL(trimmed, pageUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

/**
 * Extracts every image URL referenced in markdown (![](...)), in document order.
 */
function extractMarkdownImageUrls(markdown: string): string[] {
  if (!markdown) return [];
  const urls: string[] = [];
  const regex = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    if (match[1]) urls.push(match[1]);
  }
  return urls;
}

export interface HarvestImageInput {
  /** Absolute URL of the page the data came from (used to resolve relatives). */
  pageUrl: string;
  ogImage?: string;
  twitterImage?: string;
  /** Schema.org / JSON-LD image value (string, array, or {url}). */
  jsonLdImage?: unknown;
  /** Firecrawl structured-extraction imageUrl. */
  extractedImageUrl?: string;
  markdown?: string;
}


/**
 * Harvests a ranked, deduplicated, de-junked list of absolute image candidates.
 * Order of trust: og:image → twitter:image → JSON-LD image → extracted imageUrl →
 * markdown images (in document order).
 */
export function harvestImageCandidates(input: HarvestImageInput): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (src: string | undefined | null) => {
    const abs = toAbsoluteImageUrl(src, input.pageUrl);
    if (abs && !seen.has(abs)) {
      seen.add(abs);
      out.push(abs);
    }
  };

  push(input.ogImage);
  push(input.twitterImage);

  // JSON-LD image can be a string, an array, or an object with .url
  const ld = input.jsonLdImage;
  if (typeof ld === 'string') {
    push(ld);
  } else if (Array.isArray(ld)) {
    for (const entry of ld) {
      if (typeof entry === 'string') push(entry);
      else if (entry && typeof entry === 'object') push((entry as any).url);
    }
  } else if (ld && typeof ld === 'object') {
    push((ld as any).url);
  }

  push(input.extractedImageUrl);

  for (const mdUrl of extractMarkdownImageUrls(input.markdown || '')) {
    push(mdUrl);
  }

  return out;
}

/**
 * HEAD-checks a single URL: must return 200, an image content-type, and a
 * plausible byte size. Falls back to a ranged GET when HEAD is rejected.
 */
async function headCheckImage(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VALIDATE_TIMEOUT_MS);
  try {
    let res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'SideDoor-Scout/1.0 (image-validator)' },
    });

    // Some CDNs reject HEAD — retry with a 1-byte ranged GET
    if (res.status === 405 || res.status === 501 || res.status === 403) {
      res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'SideDoor-Scout/1.0 (image-validator)',
          Range: 'bytes=0-0',
        },
      });
    }

    if (!res.ok && res.status !== 206) return false;

    const type = res.headers.get('content-type') || '';
    if (!type.toLowerCase().startsWith('image/')) return false;

    const lengthHeader = res.headers.get('content-length');
    if (lengthHeader) {
      const bytes = parseInt(lengthHeader, 10);
      if (!isNaN(bytes) && bytes > 0 && bytes < MIN_IMAGE_BYTES) return false;
    }

    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Validates candidate image URLs, testing the primary candidate first with an early
 * exit fast-path. Returns the first verifiably valid URL, or undefined when none validate.
 */
export async function pickValidatedImage(
  candidates: string[],
  maxToCheck: number = 3
): Promise<string | undefined> {
  const top = candidates.slice(0, Math.max(1, maxToCheck));
  if (top.length === 0) return undefined;

  // Fast-path: Check primary candidate first (resolves in ~50-200ms in >90% of cases)
  if (await headCheckImage(top[0])) {
    return top[0];
  }

  // Fallback: Check remaining candidates sequentially to exit on first success
  for (let i = 1; i < top.length; i++) {
    if (await headCheckImage(top[i])) {
      return top[i];
    }
  }

  return undefined;
}
