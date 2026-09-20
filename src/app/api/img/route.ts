import { NextRequest, NextResponse } from 'next/server';

/**
 * Layer 2 of the image system: a same-origin image proxy.
 *
 * The browser loads `/api/img?src=<url>&w=<px>` instead of the raw remote URL.
 * Benefits:
 *  - Strips the cross-origin Referer/Origin that triggers hotlink protection.
 *  - Hides expired/dead/forbidden remote URLs behind a safe placeholder.
 *  - Lets the UI use next/image without configuring remotePatterns per host.
 *
 * On any failure it returns a themed 1×1 transparent GIF with a short cache,
 * never a broken image.
 */

const FETCH_TIMEOUT_MS = 6000;

/** 1×1 transparent GIF used as the universal fallback. */
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

function placeholderResponse(cacheSeconds: number): NextResponse {
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': `public, max-age=${cacheSeconds}`,
      'X-Image-Proxy': 'fallback',
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const src = searchParams.get('src');

  if (!src) {
    return placeholderResponse(60);
  }

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    return placeholderResponse(60);
  }

  // Only proxy http(s) image requests — block file:, data:, internal hosts, etc.
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return placeholderResponse(60);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      // Send a neutral browser-like identity; crucially no cross-origin Referer.
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      // Next.js fetch cache: cache successful fetches for 5 minutes.
      next: { revalidate: 300 },
    });

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();

    if (!upstream.ok || !contentType.startsWith('image/')) {
      return placeholderResponse(120);
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'X-Image-Proxy': 'ok',
      },
    });
  } catch {
    return placeholderResponse(120);
  } finally {
    clearTimeout(timer);
  }
}
