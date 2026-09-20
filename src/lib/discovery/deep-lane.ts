import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { EventCategory } from '@/types';
import { CandidateEvent, ScrapedPageInput } from '@/types/discovery';
import { getGoogleApiKey, MARKDOWN_EXCERPT_LIMIT, SIDEDOOR_MODEL } from './config';
import { buildDeepLaneSystemPrompt } from './prompts';
import { createCandidateId } from './id';
import { getTemporalContext } from '../temporal';

/**
 * Lane B: Deep-lane unstructured DIY parser. LLM fallback for scraped pages
 * where the deterministic JSON-LD pre-parser found no structured events.
 */

const UnstructuredExtractionSchema = z.object({
  events: z.array(
    z.object({
      title: z.string().describe('Event name or headline band/artist'),
      venueName: z.string().describe('Venue, gallery, or space name'),
      address: z.string().describe('Neighborhood or street address'),
      coordinates: z
        .object({ lat: z.number(), lng: z.number() })
        .optional()
        .describe('Approximated coordinates for neighborhood'),
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
    throw new Error(
      'Missing Google Gemini API Key. Please set GOOGLE_GENERATIVE_AI_API_KEY in .env.local.'
    );
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
    system: buildDeepLaneSystemPrompt(temporal, locationHint),
    prompt: `User Query: "${userPrompt}"\n\nContent:\n${combined}`,
  });

  return result.object.events.map((evt) => ({
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
    coverImage: pages[0]?.ogImage,
    sourceUrl: pages[0]?.url || '',
    organizerName: evt.organizerName || evt.venueName,
    organizerEmail: evt.organizerEmail || '',
    rawSnippet: evt.description,
  }));
}