import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { EventCategory, LocalEvent, Coordinates } from '@/types';
import { CandidateEvent } from '@/types/discovery';
import { pickValidatedImage } from '../images';
import { calculateHaversineDistanceKm } from '../geo';
import { toEventId } from './extraction';
import { getGoogleApiKey, SIDEDOOR_MODEL } from './query-refiner';

export const MAX_PIPELINE_CANDIDATES = 25;

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

  const curatedResults = await Promise.all(
    candidates.map(async (cand): Promise<LocalEvent | null> => {
      const curation = lookup.get(cand.id);
      if (curation && curation.matchScore < 60) return null;

      const hasCandCoords =
        cand.coordinates &&
        typeof cand.coordinates.lat === 'number' &&
        typeof cand.coordinates.lng === 'number' &&
        !isNaN(cand.coordinates.lat) &&
        !isNaN(cand.coordinates.lng) &&
        (cand.coordinates.lat !== 0 || cand.coordinates.lng !== 0);

      const hasUserCoords =
        userCoordinates &&
        typeof userCoordinates.lat === 'number' &&
        typeof userCoordinates.lng === 'number' &&
        !isNaN(userCoordinates.lat) &&
        !isNaN(userCoordinates.lng);

      const eventCoords: Coordinates = hasCandCoords
        ? cand.coordinates!
        : hasUserCoords
        ? userCoordinates!
        : { lat: 0, lng: 0 };

      let distanceKm: number | undefined = undefined;

      if (hasUserCoords && hasCandCoords) {
        distanceKm = calculateHaversineDistanceKm(
          userCoordinates!.lat,
          userCoordinates!.lng,
          cand.coordinates!.lat,
          cand.coordinates!.lng
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
