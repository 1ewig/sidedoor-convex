import { LocalEvent } from '@/types';
import { CandidateEvent, HybridDiscoveryResult, ScrapedPageInput } from '@/types/discovery';
import { extractStructuredEventsFromHtml } from '../schema-org';
import { extractFromUnstructuredMarkdown } from './deep-lane';
import { curateCandidatesWithLLM } from './curator';
import { MAX_PIPELINE_CANDIDATES } from './config';
import { getTemporalContext } from '../temporal';
import { calculateHaversineDistanceKm } from '../geo';

/**
 * Master coordinator: runs the two-lane hybrid discovery pipeline.
 *
 * 1. Lane A — deterministic Schema.org JSON-LD extraction (no LLM cost)
 * 2. Lane B — Gemini deep-lane fallback for pages without structured data
 * 3. Semantic curator — LLM enrichment (matchScore, vibeTags, tagline)
 * 4. Haversine distance enrichment against real user coordinates
 */
export async function runHybridEventDiscovery(
  scrapedPages: ScrapedPageInput[],
  userPrompt: string,
  locationHint: string = 'Brooklyn / NYC',
  userCoordinates?: { lat: number; lng: number }
): Promise<HybridDiscoveryResult> {
  const { targetWeekendRange } = getTemporalContext();

  const laneA_Candidates: CandidateEvent[] = [];
  const laneB_Pages: ScrapedPageInput[] = [];

  // Dispatch pages to Lane A vs Lane B
  for (const page of scrapedPages) {
    const rawContent = page.rawHtml || '';
    const structured = extractStructuredEventsFromHtml(
      rawContent,
      page.url,
      page.ogImage,
      { weekendStart: targetWeekendRange.start, weekendEnd: targetWeekendRange.end }
    );

    if (structured.length > 0) {
      laneA_Candidates.push(...structured);
    } else {
      laneB_Pages.push(page);
    }
  }

  // Process Lane B if any pages lacked JSON-LD
  let laneB_Candidates: CandidateEvent[] = [];
  if (laneB_Pages.length > 0) {
    laneB_Candidates = await extractFromUnstructuredMarkdown(laneB_Pages, userPrompt, locationHint);
  }

  const allCandidates = [...laneA_Candidates, ...laneB_Candidates].slice(0, MAX_PIPELINE_CANDIDATES);

  const curatorStart = Date.now();
  const curatedEvents = await curateCandidatesWithLLM(allCandidates, userPrompt, userCoordinates);
  const curationTimeSec = parseFloat(((Date.now() - curatorStart) / 1000).toFixed(2));

  // Compute exact Haversine distance if user coordinates provided
  const finalEvents: LocalEvent[] = curatedEvents.map((evt) => {
    if (
      userCoordinates &&
      typeof userCoordinates.lat === 'number' &&
      typeof userCoordinates.lng === 'number' &&
      typeof evt.coordinates?.lat === 'number' &&
      typeof evt.coordinates?.lng === 'number'
    ) {
      const distance = calculateHaversineDistanceKm(
        userCoordinates.lat,
        userCoordinates.lng,
        evt.coordinates.lat,
        evt.coordinates.lng
      );
      return { ...evt, distanceKm: distance };
    }
    return evt;
  });

  return {
    events: finalEvents,
    stats: {
      structuredCount: laneA_Candidates.length,
      unstructuredCount: laneB_Candidates.length,
      pagesScrapedCount: scrapedPages.length,
      curationTimeSec,
    },
  };
}