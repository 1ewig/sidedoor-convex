import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { LocalEvent, EventCategory } from '@/types';

// ==============================================================================
// 1. STEP 1 SCHEMA: Intent -> 3 Targeted Firecrawl Queries
// ==============================================================================
export const DiscoveryQueriesSchema = z.object({
  queries: z
    .array(z.string())
    .length(3)
    .describe('Exactly 3 distinct search queries optimized for finding local event listings, venue calendars, and DIY flyers via Firecrawl'),
  reasoning: z
    .string()
    .describe('Brief rationale explaining how these queries capture different angles of the user intent'),
  vibeTags: z
    .array(z.string())
    .describe('3-5 aesthetic and category tags extracted from the prompt (e.g. #IndieRock, #NightMarket, #Vernissage)'),
});

export type DiscoveryQueriesResult = z.infer<typeof DiscoveryQueriesSchema> & {
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    inputTokens?: any;
    outputTokens?: any;
    raw?: any;
  };
};

// ==============================================================================
// 2. STEP 3 SCHEMA: Scraped Markdown -> Structured UI LocalEvent[]
// ==============================================================================
export const RawExtractedEventSchema = z.object({
  title: z.string().describe('Name of the show, performance, vernissage, or market'),
  category: z
    .enum(['music', 'art', 'market', 'food', 'community', 'nightlife'])
    .describe('Primary category of the gathering'),
  tagline: z.string().describe('Punchy 1-line captivating summary for the card (e.g. "Lo-fi garage rock & secret basement stage")'),
  description: z.string().describe('2-3 sentence overview describing the atmosphere, headliners, and activities'),
  venueName: z.string().describe('Name of the venue, gallery, or park space'),
  address: z.string().describe('Street address or neighborhood (e.g. 140 Wilson Ave, Bushwick)'),
  distanceKm: z.number().min(0.5).max(50).describe('Estimated distance in km from user context (e.g. 3.4)'),
  coordinates: z.object({
    lat: z.number().describe('Latitude (e.g. ~40.718 for NYC)'),
    lng: z.number().describe('Longitude (e.g. ~-73.985 for NYC)'),
  }),
  isoDate: z
    .string()
    .optional()
    .describe('ISO 8601 date string for the event (e.g. 2026-09-19T20:00:00Z) based on date and time'),
  formattedDate: z.string().describe('Clean human readable date (e.g. "Saturday, Sep 19" or "Tonight")'),
  formattedTime: z.string().describe('Time window (e.g. "8:00 PM - Late" or "11:00 AM - 5:00 PM")'),
  price: z.string().describe('Pricing label (e.g. "Free Entry", "$15 at door", "PWYC", "$20")'),
  isFree: z.boolean().describe('True if zero cost admission or free RSVP'),
  matchScore: z.number().min(60).max(100).describe('Match percentage against user taste (e.g. 95)'),
  vibeTags: z.array(z.string()).describe('3-4 hashtags (e.g. ["#IndieRock", "#DIY", "#Bushwick"])'),
  organizerName: z.string().describe('Host, curator, or venue booking contact name'),
  organizerEmail: z.string().describe('Organizer or venue contact email for AgentMail outreach (e.g. booking@venue.org)'),
  sourceUrl: z.string().describe('URL where this event was discovered'),
  coverImage: z
    .string()
    .optional()
    .describe('Direct URL of the event photo, flyer, or venue picture found in markdown images or links (e.g. https://.../flyer.jpg)'),
});

export const ExtractedEventsListSchema = z.object({
  events: z.array(RawExtractedEventSchema).describe('List of verified, distinct local events extracted from markdown'),
});

export interface ScrapedPageInput {
  url: string;
  title?: string;
  markdown: string;
  ogImage?: string;
}

/**
 * Calculates current date and upcoming weekend strings for accurate temporal query anchoring
 */
export function getTemporalContext(): {
  currentDateStr: string;
  weekendStr: string;
  monthYearStr: string;
} {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const currentDateStr = now.toLocaleDateString('en-US', options);

  // Determine upcoming weekend or current weekend dates
  // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat
  const day = now.getDay();
  const fridayOffset = day === 6 ? -1 : day === 0 ? -2 : (5 - day + 7) % 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + fridayOffset);

  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);

  const mF = friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const mS = saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const mSu = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const weekendStr = `${mF}, ${mS}, and ${mSu}`;
  const monthYearStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return { currentDateStr, weekendStr, monthYearStr };
}

/**
 * Step 1: Transforms a natural language prompt into 3 targeted Firecrawl search queries.
 */
export async function generateDiscoveryQueries(
  userPrompt: string,
  locationHint: string = 'Brooklyn / NYC',
  options?: {
    thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  }
): Promise<DiscoveryQueriesResult> {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing Google Gemini API Key. Please set GOOGLE_GENERATIVE_AI_API_KEY in .env.local.'
    );
  }

  const { currentDateStr, weekendStr, monthYearStr } = getTemporalContext();

  const systemPrompt = `You are SideDoor's autonomous scout planner.
Your mission is to take a user's natural language request and generate exactly 3 distinct, high-precision web search queries for Firecrawl to discover real, upcoming local events, indie venues, popups, and small-door gatherings.

Temporal Anchor:
- Reference Date: ${currentDateStr}
- Upcoming Weekend: ${weekendStr} (${monthYearStr})

Search Query Strategy & Domain Targeting:
1. Query 1 (Underground/DIY & Live Music):
   - Target genuine indie venue calendars, underground show boards, and DIY platforms in the specified location.
   - When appropriate, prioritize high-signal music portals: site:ohmyrockness.com, site:ra.co, site:dice.fm, site:bowerypresents.com.
   - Anchor to current timeframe: "${monthYearStr}" or "${weekendStr}".
2. Query 2 (Neighborhood Markets, Vernissages, & Gallery Openings):
   - Target local artisan night fleas, maker popups, and independent art gallery openings.
   - When appropriate, prioritize arts/market portals: site:artrabbit.com, site:e-flux.com, site:nyartbeat.com, site:brooklynflea.com.
3. Query 3 (Secret Shows, Indie RSVPs & Community Dispatches):
   - Target secret gatherings, DIY linktrees, or platform RSVPs (e.g. site:lu.ma, site:partiful.com, "secret show", "loft party").

Anti-Commercial Guardrails:
- Append negative filters where appropriate to exclude stadium tours and ticket scalpers: -site:ticketmaster.com -site:stubhub.com -site:seatgeek.com.
- Never search for generic "Top 10 tourist attractions". Search for specific calendars, flyers, and lineups.
- Include location context ("${locationHint}").
- Output exactly 3 queries.`;

  const thinkingLevel = options?.thinkingLevel ?? 'high';

  const result = await generateObject({
    model: google('gemini-3.5-flash-lite'),
    schema: DiscoveryQueriesSchema,
    system: systemPrompt,
    prompt: `User Request: "${userPrompt}"\nLocation Context: "${locationHint}"\nTimeframe: "${weekendStr} (${monthYearStr})"`,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingLevel,
        },
      },
    },
  });

  return {
    ...result.object,
    usage: result.usage,
  };
}

/**
 * Step 3: Extracts fully-structured LocalEvent objects directly matching the UI schema
 * from raw Firecrawl-scraped markdown content.
 */
export async function extractEventsFromMarkdown(
  scrapedPages: ScrapedPageInput[],
  userPrompt: string,
  locationHint: string = 'Brooklyn / NYC',
  options?: {
    thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  }
): Promise<LocalEvent[]> {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing Google Gemini API Key. Please set GOOGLE_GENERATIVE_AI_API_KEY in .env.local.'
    );
  }

  const { currentDateStr, weekendStr, monthYearStr } = getTemporalContext();

  // Combine scraped markdown with OpenGraph images and up to 35k chars per source
  const combinedMarkdown = scrapedPages
    .map((p, i) => {
      const header = `### Source [${i + 1}]: ${p.title || 'Venue Calendar'} (${p.url})`;
      const imgInfo = p.ogImage ? `Source Cover Flyer: ${p.ogImage}\n` : '';
      const content = (p.markdown || '').slice(0, 35000);
      return `${header}\n${imgInfo}${content}`;
    })
    .join('\n\n---\n\n');

  const systemPrompt = `You are SideDoor's chief event curator.
Your task is to parse raw markdown scraped from local venue calendars, DIY concert listings, night flea announcements, and art gallery websites.

Temporal Anchor:
- Reference Date: ${currentDateStr}
- Target Active Window: ${weekendStr} (${monthYearStr})

Instructions:
1. STRICT TEMPORAL FILTER: Only extract events that are happening around the target active window (${monthYearStr} or this upcoming weekend).
   - REJECT past archived events from previous months or years.
   - REJECT distant future events scheduled months away.
2. Extract real event details (headliners/artists, venue name, address, date/time, door price).
3. If exact coordinates are missing, provide accurate coordinates for the venue/neighborhood in ${locationHint}.
4. Assign a realistic Vibe Match Score (0-100) based on how well the event matches: "${userPrompt}".
5. If a venue contact email is not explicitly written, generate a realistic booking/organizer email (e.g. booking@<venuedomain> or info@<venuedomain>) so AgentMail can reach out.
6. Provide a punchy tagline and 2-3 sentence overview.
7. For coverImage: If the source header specifies a "Source Cover Flyer" or if markdown contains flyer images (e.g. ![...](url)), extract and assign the image URL.`;

  const thinkingLevel = options?.thinkingLevel ?? 'high';

  const result = await generateObject({
    model: google('gemini-3.5-flash-lite'),
    schema: ExtractedEventsListSchema,
    system: systemPrompt,
    prompt: `User Request: "${userPrompt}"\n\nScraped Markdown Data:\n${combinedMarkdown}`,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingLevel,
        },
      },
    },
  });

  // Map to full typed LocalEvent objects
  return result.object.events.map((evt, idx) => {
    // Fallback to matching source page's ogImage if coverImage wasn't extracted
    const matchedSource = scrapedPages.find(
      (p) => p.url === evt.sourceUrl || (evt.sourceUrl && p.url.includes(evt.sourceUrl))
    );
    const fallbackImage = matchedSource?.ogImage || scrapedPages[idx % scrapedPages.length]?.ogImage;
    const finalCoverImage = evt.coverImage || fallbackImage;

    return {
      id: `evt-${Date.now()}-${idx + 1}`,
      title: evt.title,
      category: evt.category as EventCategory,
      tagline: evt.tagline,
      description: evt.description,
      venueName: evt.venueName,
      address: evt.address,
      distanceKm: evt.distanceKm,
      coordinates: evt.coordinates,
      dateTime: evt.isoDate || new Date().toISOString(),
      formattedDate: evt.formattedDate,
      formattedTime: evt.formattedTime,
      price: evt.price,
      isFree: evt.isFree,
      matchScore: evt.matchScore,
      vibeTags: evt.vibeTags,
      organizerName: evt.organizerName,
      organizerEmail: evt.organizerEmail,
      sourceUrl: evt.sourceUrl,
      firecrawlExtractedAt: 'Just now',
      coverImage: finalCoverImage,
      outreachStatus: 'none',
    };
  });
}
