import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { EventCategory, LocalEvent, Coordinates } from '@/types';
import { CandidateEvent } from '@/types/discovery';
import { getGoogleApiKey, SIDEDOOR_MODEL } from './config';
import { buildCuratorSystemPrompt } from './prompts';
import { pickValidatedImage } from '../images';
import { toEventId } from './id';
import { calculateHaversineDistanceKm } from '../geo';

/**
 * Unified semantic curator. Takes consolidated Lane A + Lane B candidates and
 * enriches them into UI-ready LocalEvent objects (matchScore, vibeTags, tagline, distance).
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

export async function curateCandidatesWithLLM(
  candidates: CandidateEvent[],
  userPrompt: string,
  userCoordinates?: Coordinates
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

      // Layer 1 validation: prefer a candidate that verifiably serves a real
      // image, then order the validated winner first for the UI fallback walk.
      // Candidate image HEAD validations execute concurrently across all candidates.
      const rawImages = (cand.coverImages && cand.coverImages.length > 0
        ? cand.coverImages
        : cand.coverImage
        ? [cand.coverImage]
        : []
      );
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