import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { getGoogleApiKey, SIDEDOOR_MODEL } from './config';
import { buildQueryPlannerSystemPrompt } from './prompts';
import { getTemporalContext } from '../temporal';

/**
 * Step 1: Query planning. Transforms a natural language prompt into
 * 3 targeted Firecrawl search queries via Gemini structured output.
 */

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

export async function generateDiscoveryQueries(
  userPrompt: string,
  locationHint: string = 'Brooklyn / NYC',
  options?: {
    thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  }
): Promise<DiscoveryQueriesResult> {
  const apiKey = getGoogleApiKey();

  if (!apiKey) {
    throw new Error(
      'Missing Google Gemini API Key. Please set GOOGLE_GENERATIVE_AI_API_KEY in .env.local.'
    );
  }

  const temporal = getTemporalContext();

  const thinkingLevel = options?.thinkingLevel ?? 'high';

  const result = await generateObject({
    model: google(SIDEDOOR_MODEL),
    schema: DiscoveryQueriesSchema,
    system: buildQueryPlannerSystemPrompt(temporal, locationHint),
    prompt: `User Request: "${userPrompt}"\nLocation Context: "${locationHint}"\nTimeframe: "${temporal.weekendStr} (${temporal.monthYearStr})"`,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingLevel,
        },
      },
    },
  });

  // Defensive location guarantee: ensure every query contains local geography
  const locKeywords = locationHint
    .toLowerCase()
    .split(/[\s,/]+/)
    .filter((w) => w.length > 2);
  const primaryLoc = locationHint.split('/')[0].trim();

  const anchoredQueries = result.object.queries.map((q) => {
    const qLower = q.toLowerCase();
    const hasLocation = locKeywords.some((kw) => qLower.includes(kw));
    return hasLocation ? q : `${q} ${primaryLoc}`;
  });

  return {
    ...result.object,
    queries: anchoredQueries,
    usage: result.usage,
  };
}