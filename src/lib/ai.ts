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

  const systemPrompt = `You are SideDoor's autonomous scout planner.
Your mission is to take a user's natural language weekend request and generate exactly 3 distinct, high-precision web search queries for Firecrawl to discover real local events, indie venues, popups, and small-door gatherings.

Search Query Strategy:
1. Query 1 (Specific Vibe & Genre): Target specific underground/DIY calendars, venues, and genre listings for the user's primary taste.
2. Query 2 (Neighborhood & Gathering Format): Target local community boards, flea markets, galleries, or taproom popups in the specified area.
3. Query 3 (Alternative / Secret / Discovery Angle): Target secret show listings, ticket links, Instagram/Luma/Dice linktrees, or weekly arts dispatches.

Rules:
- Include location context ("${locationHint}") and timeframe ("this weekend").
- Output exactly 3 queries.`;

  const thinkingLevel = options?.thinkingLevel ?? 'high';

  const result = await generateObject({
    model: google('gemini-3.5-flash-lite'),
    schema: DiscoveryQueriesSchema,
    system: systemPrompt,
    prompt: `User Request: "${userPrompt}"\nLocation Context: "${locationHint}"`,
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

Extract authentic, distinct events that fit the user's prompt: "${userPrompt}" in "${locationHint}".

Instructions:
1. Extract real event details (headliners/artists, venue name, address, date/time, door price).
2. If exact coordinates are missing, provide accurate coordinates for the venue/neighborhood in ${locationHint}.
3. Assign a realistic Vibe Match Score (0-100) based on how well the event matches: "${userPrompt}".
4. If a venue contact email is not explicitly written, generate a realistic booking/organizer email (e.g. booking@<venuedomain> or info@<venuedomain>) so AgentMail can reach out.
5. Provide a punchy tagline and 2-3 sentence overview.
6. For coverImage: If the source header specifies a "Source Cover Flyer" or if markdown contains flyer images (e.g. ![...](url)), extract and assign the image URL.`;

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
