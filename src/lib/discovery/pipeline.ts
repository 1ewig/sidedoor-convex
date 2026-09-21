import { CandidateEvent, HybridDiscoveryResult, ScrapedPageInput } from '@/types/discovery';
import { extractStructuredEventsFromHtml } from '../schema-org';
import { getTemporalContext } from '../temporal';
import { mineListingEvents, isListingPage, extractFromUnstructuredMarkdown } from './extraction';
import { dedupeAndRankCandidates, curateCandidatesWithLLM, MAX_PIPELINE_CANDIDATES } from './curator';

export * from './query-refiner';
export * from './extraction';
export * from './curator';

// ---------------------------------------------------------------------------
// Master Hybrid Discovery Pipeline Coordinator
// ---------------------------------------------------------------------------

/**
 * Master coordinator: runs the fast two-lane discovery pipeline.
 *
 * 1. Lane A — deterministic Schema.org JSON-LD extraction + Heuristic Snippet Mining (0 LLM cost)
 * 2. Lane B — Gemini fallback for pages without structured data
 * 3. Cross-Domain Deduplication & Richness Merging
 * 4. Semantic curator — LLM enrichment (matchScore, vibeTags, tagline, distance & image validation)
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

  // Dispatch pages: use Schema.org and Listing Snippet mining
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

  // Process Lane B fallback only if Lane A found insufficient candidates (< 3)
  let laneB_Candidates: CandidateEvent[] = [];
  if (laneA_Candidates.length < 3 && laneB_Pages.length > 0) {
    console.log(`[Pipeline] ⚡ Lane A found ${laneA_Candidates.length} candidates, running Lane B fallback...`);
    laneB_Candidates = await extractFromUnstructuredMarkdown(laneB_Pages, userPrompt, locationHint);
  } else if (laneB_Pages.length > 0) {
    console.log(`[Pipeline] ⚡ Lane A found ${laneA_Candidates.length} structured candidates, skipping Lane B fallback.`);
  }

  console.log(
    `[Pipeline] 🚦 Raw extraction complete: ${laneA_Candidates.length} from Lane A (structured/mined), ${laneB_Candidates.length} from Lane B (unstructured).`
  );

  // Cross-domain fuzzy deduplication and data-richness merging
  const rawPool = [...laneA_Candidates, ...laneB_Candidates];
  const deduplicatedPool = dedupeAndRankCandidates(rawPool);
  const allCandidates = deduplicatedPool.slice(0, MAX_PIPELINE_CANDIDATES);

  console.log(
    `[Pipeline] 🧬 Deduplication merged ${rawPool.length} raw candidates → ${deduplicatedPool.length} unique candidates (Top ${allCandidates.length} selected for curation).`
  );

  console.log(`[Curator] ✨ Curating ${allCandidates.length} candidate events with Gemini...`);
  const curatorStart = Date.now();
  const curatedEvents = await curateCandidatesWithLLM(allCandidates, userPrompt, userCoordinates, locationHint);
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