import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { EventCategory, LocalEvent } from '@/types';
import { CandidateEvent } from '@/types/discovery';
import { getGoogleApiKey, SIDEDOOR_MODEL } from './config';
import { buildCuratorSystemPrompt } from './prompts';

/**
 * Unified semantic curator. Takes consolidated Lane A + Lane B candidates and
 * enriches them into UI-ready LocalEvent objects (matchScore, vibeTags, tagline).
 */

const SemanticCuratorSchema = z.object({
  curatedEvents: z.array(
    z.object({
      candidateId: z.string().describe('The id of the candidate being curated'),
      matchScore: z.number().min(50).max(100).describe('Aesthetic and vibe match score from 50 to 100'),
      tagline: z.string().describe('Punchy poetic 1-line summary (e.g. "Lo-fi garage rock & secret basement stage")'),
      editorialOverview: z.string().describe('2-sentence atmospheric description of why this gathering is worth going to'),
      vibeTags: z.array(z.string()).describe('3-4 hashtags (e.g. ["#IndieRock", "#DIY", "#Bushwick"])'),
      category: z.enum(['music', 'art', 'market', 'food', 'community', 'nightlife']).optional(),
      suggestedOrganizerEmail: z.string().optional().describe('Curated booking/contact email if original was blank'),
    })
  ),
});

/** Default fallback anchor when neither the candidate nor the user provides coordinates. */
export const DEFAULT_FALLBACK_COORDINATES = { lat: 40.7128, lng: -73.95 };

export async function curateCandidatesWithLLM(
  candidates: CandidateEvent[],
  userPrompt: string,
  fallbackCoordinates?: { lat: number; lng: number }
): Promise<LocalEvent[]> {
  if (candidates.length === 0) return [];

  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new Error(
      'Missing Google Gemini API Key. Please set GOOGLE_GENERATIVE_AI_API_KEY in .env.local.'
    );
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
    system: buildCuratorSystemPrompt(userPrompt),
    prompt: `Candidate Events for Curation:\n${JSON.stringify(compactCandidates, null, 2)}`,
  });

  const lookup = new Map<string, (typeof result.object.curatedEvents)[0]>();
  for (const item of result.object.curatedEvents) {
    lookup.set(item.candidateId, item);
  }

  const anchor = fallbackCoordinates || DEFAULT_FALLBACK_COORDINATES;
  const finalEvents: LocalEvent[] = [];

  for (const cand of candidates) {
    const curation = lookup.get(cand.id);
    if (curation && curation.matchScore < 60) continue;

    finalEvents.push({
      id: cand.id.replace('cand-', 'evt-'),
      title: cand.title,
      category: (curation?.category || cand.category || 'music') as EventCategory,
      tagline: curation?.tagline || `Live at ${cand.venueName}`,
      description: curation?.editorialOverview || cand.rawSnippet || `Gathering hosted at ${cand.venueName}.`,
      venueName: cand.venueName,
      address: cand.address,
      distanceKm: 0,
      coordinates: cand.coordinates || anchor,
      dateTime: cand.isoDate || new Date().toISOString(),
      formattedDate: cand.formattedDate || 'This Weekend',
      formattedTime: cand.formattedTime || '8:00 PM',
      price: cand.price,
      isFree: cand.isFree,
      matchScore: curation?.matchScore || 85,
      vibeTags: curation?.vibeTags || ['#Local', '#Culture', '#DIY'],
      organizerName: cand.organizerName || cand.venueName,
      organizerEmail: cand.organizerEmail || curation?.suggestedOrganizerEmail || `booking@${cand.venueName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      sourceUrl: cand.sourceUrl,
      firecrawlExtractedAt: `Hybrid (${cand.sourceLane})`,
      coverImage: cand.coverImage,
      outreachStatus: 'none',
    });
  }

  return finalEvents.sort((a, b) => b.matchScore - a.matchScore);
}