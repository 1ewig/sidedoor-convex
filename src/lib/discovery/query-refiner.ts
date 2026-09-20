import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getTemporalContext } from '../temporal';

export const SIDEDOOR_MODEL = 'gemini-3.5-flash-lite';

export function getGoogleApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY
  );
}

// ---------------------------------------------------------------------------
// Step 1: Gemini Query Refinement Schema
// ---------------------------------------------------------------------------

export const QueryRefinementSchema = z.object({
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

/**
 * Transforms informal or vibe-based prompts into high-precision search queries for Firecrawl.
 */
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
