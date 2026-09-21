import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { EventCategory } from '@/types';
import { CandidateEvent, ScrapedPageInput } from '@/types/discovery';
import { getTemporalContext } from '../temporal';
import { cleanHtmlText } from '../html';
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

export const LISTING_HINTS =
  /\/(events?|calendar|directory|whats-?on|things-to-do)\/?$|(things to do|events calendar|what'?s on|calendar)|\/(january|february|march|april|may|june|july|august|september|october|november|december)\/?$|\/(19|20)\d{2}\/?$|\/(?:c\/|discover\/|metro-areas\/|venue\/|v\/\d+|d\/|find\/|explore\/)/i;

export function isListingPage(url: string, title?: string): boolean {
  return LISTING_HINTS.test(title || '') || LISTING_HINTS.test(url);
}

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
    if (title.length < 4 && i > 0) {
      const prev = stripDateTimeText(segments[i - 1]);
      if (prev.length >= 4 && prev.length <= 80) {
        title = prev;
      }
    }

    if (title.length < 4 || title.length > 90) continue;
    if (/^(top|events?|calendar|things to do|upcoming|tickets)/i.test(title)) continue;

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

  return result.object.events.map((evt) => {
    const pageIndex =
      typeof evt.sourcePageIndex === 'number' &&
      evt.sourcePageIndex >= 1 &&
      evt.sourcePageIndex <= pages.length
        ? evt.sourcePageIndex - 1
        : 0;
    const sourcePage = pages[pageIndex] || pages[0];

    return {
      id: createCandidateId('unstructured'),
      sourceLane: 'unstructured' as const,
      title: evt.title,
      category: evt.category as EventCategory,
      venueName: evt.venueName,
      address: evt.address,
      coordinates: evt.coordinates,
      formattedDate: evt.formattedDate,
      formattedTime: evt.formattedTime,
      price: evt.price,
      isFree: evt.isFree || /free|pwyc/i.test(evt.price),
      coverImage: sourcePage?.ogImage,
      coverImages: sourcePage?.imageCandidates || (sourcePage?.ogImage ? [sourcePage.ogImage] : []),
      sourceUrl: sourcePage?.url || '',
      organizerName: evt.organizerName || evt.venueName,
      organizerEmail: evt.organizerEmail || '',
      rawSnippet: evt.description,
    };
  });
}
