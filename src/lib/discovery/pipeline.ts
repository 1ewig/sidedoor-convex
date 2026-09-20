import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { EventCategory, LocalEvent, Coordinates } from '@/types';
import { CandidateEvent, HybridDiscoveryResult, ScrapedPageInput } from '@/types/discovery';
import { extractStructuredEventsFromHtml } from '../schema-org';
import { pickValidatedImage } from '../images';
import { getTemporalContext } from '../temporal';
import { cleanHtmlText } from '../html';
import { calculateHaversineDistanceKm } from '../geo';

// ---------------------------------------------------------------------------
// Configuration & Constants
// ---------------------------------------------------------------------------

export const SIDEDOOR_MODEL = 'gemini-3.5-flash-lite';
export const MAX_PIPELINE_CANDIDATES = 25;
export const MARKDOWN_EXCERPT_LIMIT = 15000;

export function getGoogleApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY
  );
}

// ---------------------------------------------------------------------------
// Step 1: Gemini Query Refinement
// ---------------------------------------------------------------------------

const QueryRefinementSchema = z.object({
  searchQuery: z.string().describe(
    'A single hyper-targeted search query engineered for Firecrawl to find live venue calendars, gig lineups, and community flyers'
  ),
  effectiveLocation: z.string().describe(
    'The resolved city, borough, or neighborhood name'
  ),
  vibeTags: z.array(z.string()).describe(
    '3-4 aesthetic hashtags representing user intent and genre'
  ),
});

export interface RefinedScoutQuery {
  searchQuery: string;
  effectiveLocation: string;
  vibeTags: string[];
}

export async function refineScoutQuery(
  prompt: string,
  locationHint: string = 'Brooklyn / NYC',
  whenHint: string = 'this weekend'
): Promise<RefinedScoutQuery> {
  const apiKey = getGoogleApiKey();
  const timeSuffix = whenHint && whenHint !== 'anytime' ? ` ${whenHint}` : '';

  if (!apiKey) {
    return {
      searchQuery: `${prompt} in ${locationHint} events calendar${timeSuffix}`,
      effectiveLocation: locationHint,
      vibeTags: ['#Local', '#Culture', '#Gatherings'],
    };
  }

  const temporal = getTemporalContext();

  try {
    const result = await generateObject({
      model: google(SIDEDOOR_MODEL),
      schema: QueryRefinementSchema,
      system: `You are SideDoor's autonomous search engineer.
Your task is to transform a user's natural language, colloquial, or aesthetic gathering request into a single high-precision web search query for Firecrawl.

Temporal Context:
- Reference Date: ${temporal.currentDateStr}
- Target Time Window: ${whenHint} (${temporal.weekendStr}, ${temporal.monthYearStr})

Core Rules:
1. Turn informal or vibe descriptions (e.g. "chill natural wine listening bar", "underground techno basement", "pottery and craft flea") into explicit search queries targeting calendars, schedules, lineups, ticket links, and flyers.
2. Location Anchoring: If the user specified a location in their prompt (e.g. "in Bushwick" or "in Austin"), use that. Otherwise use the default location hint: "${locationHint}". The searchQuery MUST explicitly contain the city/neighborhood name so results don't drift.
3. Keep it to a single, high-signal search query. Avoid generic tourist terms. Focus on venue calendars, flyers, and event listings.`,
      prompt: `User Request: "${prompt}"\nDefault Location: "${locationHint}"\nTimeframe: "${whenHint}"`,
    });

    return result.object;
  } catch (err: unknown) {
    console.warn('[RefineQuery] ⚠️ Gemini refinement failed, falling back to heuristic query:', err);
    return {
      searchQuery: `${prompt} in ${locationHint} events calendar${timeSuffix}`,
      effectiveLocation: locationHint,
      vibeTags: ['#Local', '#Culture', '#Gatherings'],
    };
  }
}

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
// Listing Snippet Mining & Date Parsing
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
// Candidate Deduplication & Ranking
// ---------------------------------------------------------------------------

export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3)
  );
}

export function titleSimilarity(a: string, b: string): number {
  const setA = titleTokens(a);
  const setB = titleTokens(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  return intersection / Math.min(setA.size, setB.size);
}

function candidateRichness(cand: CandidateEvent): number {
  let score = 0;
  if (cand.title && cand.title.length > 5) score += 2;
  if (cand.venueName && cand.venueName !== 'Local Venue') score += 2;
  if (cand.address && cand.address !== cand.venueName) score += 2;
  if (cand.isoDate || (cand.formattedDate && cand.formattedDate !== 'This Weekend')) score += 3;
  if (cand.formattedTime && cand.formattedTime !== '8:00 PM') score += 1;
  if (cand.price && cand.price !== 'Door / RSVP') score += 1;
  if (cand.coverImage) score += 2;
  if (cand.coverImages && cand.coverImages.length > 1) score += 1;
  if (cand.organizerEmail) score += 3;
  if (cand.rawSnippet && cand.rawSnippet.length > 40) score += 1;
  return score;
}

export function dedupeAndRankCandidates(candidates: CandidateEvent[]): CandidateEvent[] {
  if (candidates.length <= 1) return candidates;

  const merged: CandidateEvent[] = [];

  for (const cand of candidates) {
    let duplicateIndex = -1;

    for (let i = 0; i < merged.length; i++) {
      const existing = merged[i];
      const sim = titleSimilarity(existing.title, cand.title);

      const sameDate =
        Boolean(existing.isoDate && cand.isoDate && existing.isoDate === cand.isoDate) ||
        Boolean(
          existing.formattedDate &&
            cand.formattedDate &&
            existing.formattedDate !== 'This Weekend' &&
            existing.formattedDate === cand.formattedDate
        );

      const sameVenue =
        existing.venueName &&
        cand.venueName &&
        existing.venueName.toLowerCase() === cand.venueName.toLowerCase();

      const isDupe =
        (existing.sourceUrl && cand.sourceUrl && existing.sourceUrl === cand.sourceUrl) ||
        sim >= 0.8 ||
        (sameDate && sim >= 0.55) ||
        (sameVenue && sim >= 0.55);

      if (isDupe) {
        duplicateIndex = i;
        break;
      }
    }

    if (duplicateIndex >= 0) {
      const existing = merged[duplicateIndex];
      const existingScore = candidateRichness(existing);
      const candScore = candidateRichness(cand);

      const winner = candScore > existingScore ? { ...cand } : { ...existing };
      const loser = winner === cand ? existing : cand;

      if (!winner.coverImage && loser.coverImage) winner.coverImage = loser.coverImage;
      if ((!winner.coverImages || winner.coverImages.length === 0) && loser.coverImages) {
        winner.coverImages = loser.coverImages;
      }
      if ((!winner.organizerEmail || winner.organizerEmail === '') && loser.organizerEmail) {
        winner.organizerEmail = loser.organizerEmail;
      }
      if ((!winner.address || winner.address === winner.venueName) && loser.address) {
        winner.address = loser.address;
      }
      if ((!winner.formattedDate || winner.formattedDate === 'This Weekend') && loser.formattedDate) {
        winner.formattedDate = loser.formattedDate;
        winner.isoDate = loser.isoDate;
      }
      if (!winner.rawSnippet && loser.rawSnippet) {
        winner.rawSnippet = loser.rawSnippet;
      }

      merged[duplicateIndex] = winner;
    } else {
      merged.push({ ...cand });
    }
  }

  return merged.sort((a, b) => candidateRichness(b) - candidateRichness(a));
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

// ---------------------------------------------------------------------------
// Semantic Curator
// ---------------------------------------------------------------------------

const SemanticCuratorSchema = z.object({
  curatedEvents: z.array(
    z.object({
      candidateId: z.string().describe('The id of the candidate being curated'),
      matchScore: z.number().min(50).max(100).describe('Aesthetic and vibe match score from 50 to 100'),
      tagline: z.string().describe('Punchy poetic 1-line summary'),
      editorialOverview: z.string().describe('2-sentence atmospheric description'),
      vibeTags: z.array(z.string()).describe('3-4 hashtags'),
      category: z.enum(['music', 'art', 'market', 'food', 'community', 'nightlife']).optional(),
      suggestedOrganizerEmail: z.string().optional().describe('Curated booking/contact email'),
    })
  ),
});

export async function curateCandidatesWithLLM(
  candidates: CandidateEvent[],
  userPrompt: string,
  userCoordinates?: Coordinates
): Promise<LocalEvent[]> {
  if (candidates.length === 0) return [];

  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new Error('Missing Google Gemini API Key. Please set GOOGLE_GENERATIVE_AI_API_KEY in .env.local.');
  }

  const compactCandidates = candidates.map((c) => ({
    id: c.id,
    title: c.title,
    venue: c.venueName,
    location: c.address,
    date: c.formattedDate,
    price: c.price,
    notes: c.rawSnippet || '',
  }));

  const result = await generateObject({
    model: google(SIDEDOOR_MODEL),
    schema: SemanticCuratorSchema,
    system: `You are SideDoor's Chief Culture Curator.
Review candidate events against user inquiry: "${userPrompt}".
For each candidate:
1. Assign matchScore (50-100) reflecting how authentically it matches intent.
2. Write a captivating, editorial 1-line tagline.
3. Write a vivid 2-sentence atmosphere overview.
4. Assign 3-4 aesthetic hashtags.
5. If the original candidate includes a verified email, preserve it. Otherwise leave suggestedOrganizerEmail empty.`,
    prompt: `Candidate Events for Curation:\n${JSON.stringify(compactCandidates, null, 2)}`,
  });

  const lookup = new Map<string, (typeof result.object.curatedEvents)[0]>();
  for (const item of result.object.curatedEvents) {
    lookup.set(item.candidateId, item);
  }

  const defaultAnchor: Coordinates = userCoordinates || { lat: 40.7128, lng: -73.95 };

  const curatedResults = await Promise.all(
    candidates.map(async (cand): Promise<LocalEvent | null> => {
      const curation = lookup.get(cand.id);
      if (curation && curation.matchScore < 60) return null;

      const eventCoords: Coordinates = cand.coordinates || defaultAnchor;
      let distanceKm = 0;

      if (
        userCoordinates &&
        typeof userCoordinates.lat === 'number' &&
        typeof userCoordinates.lng === 'number' &&
        typeof eventCoords.lat === 'number' &&
        typeof eventCoords.lng === 'number'
      ) {
        distanceKm = calculateHaversineDistanceKm(
          userCoordinates.lat,
          userCoordinates.lng,
          eventCoords.lat,
          eventCoords.lng
        );
      }

      const rawImages = cand.coverImages && cand.coverImages.length > 0
        ? cand.coverImages
        : cand.coverImage
        ? [cand.coverImage]
        : [];
      const validatedImage = await pickValidatedImage(rawImages, 3);
      const coverImages = validatedImage
        ? [validatedImage, ...rawImages.filter((u) => u !== validatedImage)]
        : rawImages;

      return {
        id: toEventId(cand.id),
        title: cand.title,
        category: (curation?.category || cand.category || 'music') as EventCategory,
        tagline: curation?.tagline || `Live at ${cand.venueName}`,
        description: curation?.editorialOverview || cand.rawSnippet || `Gathering hosted at ${cand.venueName}.`,
        venueName: cand.venueName,
        address: cand.address,
        distanceKm,
        coordinates: eventCoords,
        dateTime: cand.isoDate || new Date().toISOString(),
        formattedDate: cand.formattedDate || 'This Weekend',
        formattedTime: cand.formattedTime || '8:00 PM',
        price: cand.price,
        isFree: cand.isFree,
        matchScore: curation?.matchScore || 85,
        vibeTags: curation?.vibeTags || ['#Local', '#Culture', '#DIY'],
        organizerName: cand.organizerName || cand.venueName,
        organizerEmail: cand.organizerEmail || curation?.suggestedOrganizerEmail || '',
        sourceUrl: cand.sourceUrl,
        firecrawlExtractedAt: `Hybrid (${cand.sourceLane})`,
        coverImage: coverImages[0],
        coverImages,
        outreachStatus: 'none',
      };
    })
  );

  const finalEvents: LocalEvent[] = curatedResults.filter((e): e is LocalEvent => e !== null);
  return finalEvents.sort((a, b) => b.matchScore - a.matchScore);
}

// ---------------------------------------------------------------------------
// Master Hybrid Discovery Pipeline
// ---------------------------------------------------------------------------

export async function runHybridEventDiscovery(
  scrapedPages: ScrapedPageInput[],
  userPrompt: string,
  locationHint: string = 'Brooklyn / NYC',
  userCoordinates?: { lat: number; lng: number }
): Promise<HybridDiscoveryResult> {
  const { targetWeekendRange } = getTemporalContext();

  const laneA_Candidates: CandidateEvent[] = [];
  const laneB_Pages: ScrapedPageInput[] = [];

  for (const page of scrapedPages) {
    const rawContent = page.rawHtml || '';
    const structured = extractStructuredEventsFromHtml(
      rawContent,
      page.url,
      page.ogImage,
      { weekendStart: targetWeekendRange.start, weekendEnd: targetWeekendRange.end }
    );

    let minedCandidates: CandidateEvent[] = [];
    if (structured.length === 0 || isListingPage(page.url, page.title)) {
      minedCandidates = mineListingEvents(page, 6);
    }

    if (structured.length > 0 || minedCandidates.length > 0) {
      laneA_Candidates.push(...structured, ...minedCandidates);
    } else {
      laneB_Pages.push(page);
    }
  }

  let laneB_Candidates: CandidateEvent[] = [];
  if (laneB_Pages.length > 0) {
    laneB_Candidates = await extractFromUnstructuredMarkdown(laneB_Pages, userPrompt, locationHint);
  }

  console.log(
    `[Pipeline] 🚦 Raw extraction complete: ${laneA_Candidates.length} from Lane A (structured/mined), ${laneB_Candidates.length} from Lane B (unstructured).`
  );

  const rawPool = [...laneA_Candidates, ...laneB_Candidates];
  const deduplicatedPool = dedupeAndRankCandidates(rawPool);
  const allCandidates = deduplicatedPool.slice(0, MAX_PIPELINE_CANDIDATES);

  console.log(
    `[Pipeline] 🧬 Deduplication merged ${rawPool.length} raw candidates → ${deduplicatedPool.length} unique candidates (Top ${allCandidates.length} selected for curation).`
  );

  console.log(`[Curator] ✨ Curating ${allCandidates.length} candidate events with Gemini...`);
  const curatorStart = Date.now();
  const curatedEvents = await curateCandidatesWithLLM(allCandidates, userPrompt, userCoordinates);
  const curationTimeSec = parseFloat(((Date.now() - curatorStart) / 1000).toFixed(2));

  console.log(
    `[Curator] 🎯 Curation complete in ${curationTimeSec}s: ${curatedEvents.length} events passed vibe threshold.`
  );

  return {
    events: curatedEvents,
    stats: {
      structuredCount: laneA_Candidates.length,
      unstructuredCount: laneB_Candidates.length,
      pagesScrapedCount: scrapedPages.length,
      curationTimeSec,
    },
  };
}