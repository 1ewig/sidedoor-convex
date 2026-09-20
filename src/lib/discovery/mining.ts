import { CandidateEvent, ScrapedPageInput } from '@/types/discovery';
import { createCandidateId } from './id';
import { inferEventCategory } from './category';
import { cleanHtmlText } from '../html';

// ---------------------------------------------------------------------------
// Junk & Listing detection
// ---------------------------------------------------------------------------

const JUNK_HOST_PREFIX = /^(business|legal|blog|careers|jobs|support|help)\./i;
const JUNK_PATH_SEGMENT =
  /^\/(about|about-us|jobs|careers|blog|news|terms|legal|privacy|business|company|contact|team|press|mission|how-it-works|faq)(\/|$)/i;
const JUNK_PHRASES =
  /terms and conditions|privacy policy|join our team|our story|careers at|jobs at|how it works|latest news/i;
const TICKET_CATEGORY_PORTAL = /ticketmaster\.com\/(soccer|sports|music|comedy|family|theater|arts|family)\/?(\?|$)/i;

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
    // Malformed URL
    return false;
  }
  return false;
}

export const LISTING_HINTS =
  /\/(events?|calendar|directory|whats-?on|things-to-do)\/?$|(things to do|events calendar|what'?s on|calendar)|\/(january|february|march|april|may|june|july|august|september|october|november|december)\/?$|\/(19|20)\d{2}\/?$|\/(?:c\/|discover\/|metro-areas\/|venue\/|v\/\d+|d\/|find\/|explore\/)/i;

export function isListingPage(url: string, title?: string): boolean {
  return LISTING_HINTS.test(title || '') || LISTING_HINTS.test(url);
}

// ---------------------------------------------------------------------------
// Date & Time Heuristics with Range Guards
// ---------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const MONTH_NAMES = 'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec';

export function isRangeEnd(text: string, idx: number): boolean {
  const before = text.slice(Math.max(0, idx - 24), idx).toLowerCase();
  return /(?:\b(?:until|till|through|thru|recurring|daily|ends?)\b)[\s.,:–-]*$/.test(before);
}

export function toIsoDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDateText(text: string, referenceDate: Date = new Date()): {
  iso?: string;
  time?: string;
  formattedDate?: string;
  formattedTime?: string;
} {
  const out: { iso?: string; time?: string; formattedDate?: string; formattedTime?: string } = {};

  // Time extraction (e.g. 8:00 PM, 8pm, 20:00)
  const tm = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) ??
    text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (tm) {
    const h24 = tm[3]
      ? (Number(tm[1]) % 12) + (tm[3].toLowerCase() === 'pm' ? 12 : 0)
      : Number(tm[1]);
    if (h24 >= 0 && h24 <= 23) {
      const minutes = tm[2] ?? '00';
      out.time = `${String(h24).padStart(2, '0')}:${minutes}`;
      const period = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      out.formattedTime = `${h12}:${minutes} ${period}`;
    }
  }

  // ISO Date: 2026-09-21
  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch && isoMatch.index !== undefined && !isRangeEnd(text, isoMatch.index)) {
    const d = new Date(`${isoMatch[0]}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      out.iso = isoMatch[0];
      out.formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return out;
    }
  }

  // Slash Date: 09/21/2026 or 9/21/26
  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (slashMatch && slashMatch.index !== undefined && !isRangeEnd(text, slashMatch.index)) {
    const rawYear = slashMatch[3];
    const year = Number(rawYear.length === 2 ? `20${rawYear}` : rawYear);
    if (year >= 2024 && year <= 2035) {
      const d = new Date(year, Number(slashMatch[1]) - 1, Number(slashMatch[2]), 12);
      if (!Number.isNaN(d.getTime())) {
        out.iso = toIsoDateString(d);
        out.formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return out;
      }
    }
  }

  // Month-name dates: "September 21, 2026", "Sept 21", "21 September 2026"
  const m1 = text.match(
    new RegExp(`\\b(${MONTH_NAMES})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i')
  );
  const m2 = text.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAMES})[a-z]*\\.?(?:,?\\s+(\\d{4}))?\\b`, 'i')
  );
  const m = m1 ?? m2;
  if (m && m.index !== undefined && !isRangeEnd(text, m.index)) {
    const monName = (m1 ? m1[1] : m2![2]).slice(0, 3).toLowerCase();
    const day = Number(m1 ? m1[2] : m2![1]);
    const year = Number(m1 ? m1[3] : m2![3]) || referenceDate.getFullYear();
    const monthIdx = MONTHS[monName];
    if (monthIdx !== undefined) {
      const d = new Date(year, monthIdx, day, 12);
      if (!Number.isNaN(d.getTime())) {
        out.iso = toIsoDateString(d);
        out.formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Price & Free Token Extraction
// ---------------------------------------------------------------------------

export function extractPriceInfo(text: string): { price: string; isFree: boolean } {
  if (/\bfree (?:admission|entry|event|rsvp)\b|\bno cover\b|\bzero cost\b|\bpwyc\b/i.test(text)) {
    return { price: 'Free Entry', isFree: true };
  }
  const prices = [...text.matchAll(/(?:\$|€|£|USD|EUR)\s?(\d{1,4}(?:\.\d{2})?)/gi)].map((m) =>
    m[0].replace(/\s+/g, '')
  );
  const distinct = [...new Set(prices)];
  if (distinct.length === 1) {
    return { price: distinct[0], isFree: false };
  }
  if (distinct.length > 1) {
    return { price: distinct.slice(0, 2).join(' – '), isFree: false };
  }
  return { price: 'Door / RSVP', isFree: false };
}

// ---------------------------------------------------------------------------
// Strip Date / Time Text for Clean Titles
// ---------------------------------------------------------------------------

export function stripDateTimeText(s: string): string {
  return s
    .replace(
      new RegExp(`\\b(?:${MONTH_NAMES})[a-z]*\\.?\\s*\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?\\b`, 'gi'),
      ' '
    )
    .replace(
      new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTH_NAMES})[a-z]*\\.?(?:,?\\s+\\d{4})?\\b`, 'gi'),
      ' '
    )
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, ' ')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, ' ')
    .replace(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g, ' ')
    .replace(/\s+(?:on|at|from)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.,;:•·|\-–\s]+|[.,;:•·|\-–\s]+$/g, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Aggregator / Calendar Listing Snippet Mining
// ---------------------------------------------------------------------------

export function mineListingEvents(page: ScrapedPageInput, maxEvents = 6): CandidateEvent[] {
  const content = `${page.title || ''}\n${page.markdown || ''}`;
  if (!content) return [];

  const segments = content
    .split(/\s*[;•]\s*|\s*·\s*|\s*\|\s*|\r?\n/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 8);

  if (segments.length < 2) return [];

  const candidates: CandidateEvent[] = [];
  const now = new Date();

  for (let i = 0; i < segments.length && candidates.length < maxEvents; i++) {
    const seg = segments[i];
    const parsedDate = parseDateText(seg, now);
    if (!parsedDate.iso && !parsedDate.time) continue;

    let title = stripDateTimeText(seg);
    // If title was too short or only a date, look at previous segment
    if (title.length < 4 && i > 0) {
      const prev = stripDateTimeText(segments[i - 1]);
      if (prev.length >= 4 && prev.length <= 80) {
        title = prev;
      }
    }

    if (title.length < 4 || title.length > 90) continue;
    if (/^(top|events?|calendar|things to do|upcoming|tickets)/i.test(title)) continue;

    // Check next segment for venue or price
    let venueName = cleanHtmlText(page.title || 'Local Venue');
    if (i + 1 < segments.length) {
      const nextSeg = segments[i + 1];
      if (!parseDateText(nextSeg, now).iso && nextSeg.length >= 3 && nextSeg.length <= 60) {
        venueName = stripDateTimeText(nextSeg) || venueName;
      }
    }

    const { price, isFree } = extractPriceInfo(`${seg} ${i + 1 < segments.length ? segments[i + 1] : ''}`);
    const category = inferEventCategory({ text: `${title} ${venueName}` });

    candidates.push({
      id: createCandidateId('structured'),
      sourceLane: 'structured',
      title,
      category,
      venueName,
      address: venueName,
      isoDate: parsedDate.iso,
      formattedDate: parsedDate.formattedDate || 'This Month',
      formattedTime: parsedDate.formattedTime || '8:00 PM',
      price,
      isFree,
      coverImage: page.ogImage,
      coverImages: page.imageCandidates || (page.ogImage ? [page.ogImage] : []),
      sourceUrl: page.url,
      organizerName: venueName,
      rawSnippet: seg.slice(0, 250),
    });
  }

  return candidates;
}
