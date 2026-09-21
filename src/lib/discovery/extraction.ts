import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { EventCategory } from '@/types';
import { CandidateEvent, ScrapedPageInput } from '@/types/discovery';
import { getTemporalContext } from '../temporal';
import { cleanHtmlText, cleanText, stripMarkdown } from '../html';
import { getGoogleApiKey, SIDEDOOR_MODEL } from './query-refiner';

export const MARKDOWN_EXCERPT_LIMIT = 15000;

// ---------------------------------------------------------------------------
// Candidate & Event ID Generation
// ---------------------------------------------------------------------------

let counter = 0;

export function createCandidateId(lane: 'structured' | 'unstructured'): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  const laneSuffix = lane === 'structured' ? 'a' : 'b';
  return `cand-${Date.now()}-${laneSuffix}-${counter}`;
}

export function toEventId(candidateId: string): string {
  if (candidateId.startsWith('cand-')) {
    return `evt-${candidateId.slice(5)}`;
  }
  return `evt-${candidateId}`;
}

export function createEventId(): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  return `evt-${Date.now()}-${counter}`;
}

// ---------------------------------------------------------------------------
// Category Inference
// ---------------------------------------------------------------------------

interface InferCategoryInput {
  text?: string;
  schemaType?: string | string[];
}

export function inferEventCategory({ text = '', schemaType = '' }: InferCategoryInput): EventCategory {
  const typeStr = Array.isArray(schemaType) ? schemaType.join(' ') : String(schemaType || '');
  const combined = `${typeStr} ${text}`.toLowerCase();

  if (/exhibition|visualarts|gallery|vernissage|paint|sculpture|photo|museum|art/i.test(combined)) {
    return 'art';
  }
  if (/market|flea|vintage|craft|makers|bazaar|saleevent|fair/i.test(combined)) {
    return 'market';
  }
  if (/food|dinner|tasting|chef|bakery|brunch|supper|culinary|brewery|sake|wine/i.test(combined)) {
    return 'food';
  }
  if (/dance|club|rave|techno|dj|nightlife|disco|party/i.test(combined)) {
    return 'nightlife';
  }
  if (/community|meetup|volunteer|garden|talk|reading|literary|book|social/i.test(combined)) {
    return 'community';
  }

  return 'music';
}

// ---------------------------------------------------------------------------
// Date & Time Heuristics
// ---------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const MONTH_NAMES = 'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec';
const DAY_NAMES = 'monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun';

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

  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch && isoMatch.index !== undefined && !isRangeEnd(text, isoMatch.index)) {
    const d = new Date(`${isoMatch[0]}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      out.iso = isoMatch[0];
      out.formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return out;
    }
  }

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

export function extractPriceInfo(text: string): { price: string; isFree: boolean } {
  // 1. Advance vs Door pricing: e.g. "$10 adv / $15 door"
  const advDoorMatch = text.match(/(?:\$|€|£)\s?(\d+)\s*(?:adv(?:ance)?|\/|\s*-\s*)\s*(?:\$|€|£)?\s?(\d+)\s*door/i);
  if (advDoorMatch) {
    return { price: `$${advDoorMatch[1]} Adv / $${advDoorMatch[2]} Door`, isFree: false };
  }

  // 2. Conditional free: e.g. "Free before 10pm"
  const condMatch = text.match(/\bfree\s+before\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (condMatch) {
    return { price: `Free before ${condMatch[1].trim()}`, isFree: true };
  }

  // 3. Free or no-cover entry
  if (/\b(?:free\s*(?:admission|entry|event|rsvp)?|no cover|zero cost|pwyc|pay what you can|complimentary)\b/i.test(text)) {
    return { price: 'Free Entry', isFree: true };
  }

  // 4. Sliding scale / Suggested donation
  if (/\b(?:sliding scale|suggested donation)\b/i.test(text)) {
    const amtMatch = text.match(/(?:\$|€|£)\s?(\d+)/i);
    return { price: amtMatch ? `Donation (${amtMatch[0]})` : 'Sliding Scale', isFree: true };
  }

  // 5. Standard currency extraction
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

export function stripDateTimeText(s: string): string {
  return s
    .replace(new RegExp(`\\b(?:${DAY_NAMES}),?\\s+(?=(?:${MONTH_NAMES})|\\d{1,2}|at\\b|from\\b|doors\\b|[ap]\\.?m\\.?)`, 'gi'), ' ')
    .replace(new RegExp(`^\\s*(?:${DAY_NAMES})\\s*$`, 'gi'), ' ')
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
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|am|pm)\b/gi, ' ')
    .replace(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g, ' ')
    .replace(/\b(?:a\.?m\.?|p\.?m\.?)\b/gi, ' ')
    .replace(/\s+(?:on|at|from|to|doors)\s*$/i, '')
    .replace(/^\s*(?:on|at|from|to|doors)\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.,;:•·|\-–\s]+|[.,;:•·|\-–\s]+$/g, '')
    .trim();
}

export const LISTING_HINTS =
  /\/(events?|calendar|directory|whats-?on|things-to-do)\/?$|(things to do|events calendar|what'?s on|calendar)|\/(january|february|march|april|may|june|july|august|september|october|november|december)\/?$|\/(19|20)\d{2}\/?$|\/(?:c\/|discover\/|metro-areas\/|venue\/|v\/\d+|d\/|find\/|explore\/)/i;

export function isListingPage(url: string, title?: string): boolean {
  return LISTING_HINTS.test(title || '') || LISTING_HINTS.test(url);
}

export function isValidEventTitle(title?: string): boolean {
  if (!title) return false;
  const cleaned = cleanText(title);
  if (cleaned.length < 4 || cleaned.length > 100) return false;

  // Reject pure markdown fragment residue or bare URLs
  if (/^\]\([^)]*\)?$/.test(cleaned) || (/^\[.*\]$/.test(cleaned) && cleaned.length < 6) || /^https?:\/\//i.test(cleaned)) {
    return false;
  }

  // Reject standalone days of the week, temporal words, or calendar terms
  if (/^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|today|tonight|tomorrow|weekend|weekdays?|daily|monthly|annually)$/i.test(cleaned)) {
    return false;
  }

  // Must contain at least 3 letters
  const letters = cleaned.match(/[a-zA-Z]/g);
  if (!letters || letters.length < 3) return false;

  // Reject strings made up almost entirely of time suffixes (e.g. "p.m. p.m.", "am/pm", "10am"), digits, or punctuation
  const normalized = cleaned.toLowerCase().replace(/[^a-z0-9]/g, '');
  const withoutTimeOrPunct = normalized
    .replace(/(?:am|pm|est|edt|pst|pdt|cst|cdt|gmt|utc)/g, '')
    .replace(/[0-9]/g, '');
  if (withoutTimeOrPunct.length < 3) return false;

  // Reject generic listing prefixes, metadata labels, or table column headers
  if (
    /^(?:top|events?|calendar|things to do|upcoming|tickets|location|venue|where|when|details|admission|price|performer|performers|artist|artists|musician|musicians|band|bands|act|acts|lineup|schedule|doors?|show|time|date|status|action|buy tickets?|rsvp|more info|view event|tba|tbd)\s*[:\-–]?\s*$/i.test(
      cleaned
    )
  ) {
    return false;
  }

  return true;
}

const GENERIC_VENUE_WORDS = /^(shows?|events?|calendar|tickets?|schedule|upcoming|whats?\s*on|live\s*music|directory|home|official\s*site|guide|selected\s*guide)\b/i;
const SEO_SUFFIXES = /\b(?:concerts?|shows?|tickets?|calendar|live\s*music|nyc\s*events?|events?\s*calendar|guide|official\s*site|historic\s*.*jazz\s*bar|things\s*to\s*do|selected\s*gallery\s*guide.*)$/i;

export function cleanVenueName(str?: string): string {
  if (!str) return 'Local Venue';
  let cleaned = cleanText(str);

  // If there are parentheses containing a plausible venue name: e.g. "Daily Live Jazz... (Arthur's Tavern)"
  const parenMatch = cleaned.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inside = parenMatch[1].trim();
    if (inside.length >= 3 && !GENERIC_VENUE_WORDS.test(inside)) {
      cleaned = inside;
    }
  }

  // Split by common title separators
  const parts = cleaned.split(/\s+[|\-–—•·:]\s+/);
  if (parts.length > 1) {
    const candidates = parts
      .map((p) => p.trim())
      .filter((p) => p.length >= 3 && !GENERIC_VENUE_WORDS.test(p));

    if (candidates.length > 0) {
      cleaned = candidates[0];
    }
  }

  // Clean trailing SEO fluff
  cleaned = cleaned.replace(SEO_SUFFIXES, '').replace(/^[|\-–—•·:\s]+|[|\-–—•·:\s]+$/g, '').trim();

  return cleaned || 'Local Venue';
}

export function mineListingEvents(page: ScrapedPageInput, maxEvents = 6): CandidateEvent[] {
  const rawContent = `${page.title || ''}\n${page.markdown || ''}`;
  if (!rawContent) return [];

  // Decode HTML entities and unwrap markdown links BEFORE splitting segments,
  // so semicolons in HTML entities (e.g. &#038;, &amp;) don't cause segment splits,
  // and markdown links don't split between anchor and URL.
  const content = stripMarkdown(cleanHtmlText(rawContent));

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

    let title = cleanText(stripDateTimeText(seg));
    if (!isValidEventTitle(title) && i > 0) {
      const prev = cleanText(stripDateTimeText(segments[i - 1]));
      if (isValidEventTitle(prev)) {
        title = prev;
      }
    }

    if (!isValidEventTitle(title)) continue;

    let venueName = cleanVenueName(page.title);
    if (i + 1 < segments.length) {
      const nextSeg = segments[i + 1];
      if (!parseDateText(nextSeg, now).iso && nextSeg.length >= 3 && nextSeg.length <= 60) {
        const nextClean = cleanText(stripDateTimeText(nextSeg));
        if (nextClean.length >= 3 && !/^[$€£0-9]/.test(nextClean) && !/^(?:free|rsvps?|tickets?|door)/i.test(nextClean)) {
          venueName = cleanVenueName(nextClean);
        }
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

// ---------------------------------------------------------------------------
// Lane B Fallback: Unstructured Markdown Extractor
// ---------------------------------------------------------------------------

const UnstructuredExtractionSchema = z.object({
  events: z.array(
    z.object({
      sourcePageIndex: z.number().int().min(1).optional(),
      title: z.string().describe('Event name or headline band/artist'),
      venueName: z.string().describe('Venue, gallery, or space name'),
      address: z.string().describe('Neighborhood or street address'),
      coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
      category: z.enum(['music', 'art', 'market', 'food', 'community', 'nightlife']),
      formattedDate: z.string().describe('e.g. Saturday, Sep 19'),
      formattedTime: z.string().describe('e.g. 8:30 PM'),
      price: z.string().describe('e.g. $10, Free, or PWYC'),
      isFree: z.boolean(),
      description: z.string().describe('Short 1-2 sentence description'),
      organizerName: z.string().optional(),
      organizerEmail: z.string().optional(),
    })
  ),
});

export async function extractFromUnstructuredMarkdown(
  pages: ScrapedPageInput[],
  userPrompt: string,
  locationHint: string
): Promise<CandidateEvent[]> {
  if (pages.length === 0) return [];

  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new Error('Missing Google Gemini API Key. Please set GOOGLE_GENERATIVE_AI_API_KEY in .env.local.');
  }

  const temporal = getTemporalContext();
  const combined = pages
    .map((p, i) => {
      const img = p.ogImage ? `Cover Image: ${p.ogImage}\n` : '';
      return `### Source [${i + 1}]: ${p.title || 'Page'} (${p.url})\n${img}${p.markdown.slice(0, MARKDOWN_EXCERPT_LIMIT)}`;
    })
    .join('\n\n---\n\n');

  const result = await generateObject({
    model: google(SIDEDOOR_MODEL),
    schema: UnstructuredExtractionSchema,
    system: `You are SideDoor's fallback parser for unstructured DIY flyers, venue text, and linktrees.
Extract distinct events happening around: ${temporal.weekendStr} (${temporal.monthYearStr}).
Reference Date: ${temporal.currentDateStr}. Location: ${locationHint}.
Only extract real gatherings. Skip generic venue information or past events.`,
    prompt: `User Query: "${userPrompt}"\n\nContent:\n${combined}`,
  });

  return result.object.events
    .map((evt) => {
      const pageIndex =
        typeof evt.sourcePageIndex === 'number' &&
        evt.sourcePageIndex >= 1 &&
        evt.sourcePageIndex <= pages.length
          ? evt.sourcePageIndex - 1
          : 0;
      const sourcePage = pages[pageIndex] || pages[0];
      const title = cleanText(evt.title);
      const venueName = cleanText(evt.venueName);

      return {
        id: createCandidateId('unstructured'),
        sourceLane: 'unstructured' as const,
        title,
        category: evt.category as EventCategory,
        venueName,
        address: evt.address ? cleanText(evt.address) : venueName,
        coordinates: evt.coordinates,
        formattedDate: evt.formattedDate,
        formattedTime: evt.formattedTime,
        price: evt.price,
        isFree: evt.isFree || /free|pwyc/i.test(evt.price),
        coverImage: sourcePage?.ogImage,
        coverImages: sourcePage?.imageCandidates || (sourcePage?.ogImage ? [sourcePage.ogImage] : []),
        sourceUrl: sourcePage?.url || '',
        organizerName: evt.organizerName ? cleanText(evt.organizerName) : venueName,
        organizerEmail: evt.organizerEmail || '',
        rawSnippet: evt.description,
      };
    })
    .filter((cand) => isValidEventTitle(cand.title));
}
