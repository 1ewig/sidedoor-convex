import { CandidateEvent, HybridDiscoveryResult, ScrapedPageInput } from '@/types/discovery';
import { extractStructuredEventsFromHtml } from '../schema-org';
import { extractFromUnstructuredMarkdown } from './deep-lane';
import { curateCandidatesWithLLM } from './curator';
import { MAX_PIPELINE_CANDIDATES } from './config';
import { getTemporalContext } from '../temporal';
import { createCandidateId } from './id';
import { inferEventCategory } from './category';
import { toAbsoluteImageUrl } from '../images';
import { mineListingEvents, isListingPage } from './mining';
import { dedupeAndRankCandidates } from './dedupe';

function parseFirecrawlJsonCandidates(page: ScrapedPageInput): CandidateEvent[] {
  if (!page.extractedJson) return [];

  const candidates: CandidateEvent[] = [];
  const raw = page.extractedJson;

  const eventList = Array.isArray(raw.events)
    ? raw.events
    : !Array.isArray(raw) && raw.title
    ? [raw]
    : [];

  for (const item of eventList) {
    if (!item || !item.title || typeof item.title !== 'string') continue;

    const title = item.title.trim();
    if (!title) continue;

    const venue = item.venue?.trim() || page.title || 'Local Venue';
    const address = item.address?.trim() || venue;
    const price = item.price ? String(item.price).trim() : (item.isFree ? 'Free Entry' : 'Door / RSVP');
    const isFree = item.isFree === true || /free|pwyc/i.test(price);
    // Ranked candidates: Firecrawl-extracted imageUrl first, then page-level images.
    const extracted = toAbsoluteImageUrl(item.imageUrl, page.url);
    const pageCandidates = page.imageCandidates || (page.ogImage ? [page.ogImage] : []);
    const imageCandidates = extracted
      ? [extracted, ...pageCandidates.filter((u) => u !== extracted)]
      : pageCandidates;
    const coverImage = imageCandidates[0];
    const formattedDate = item.date?.trim() || 'This Weekend';
    const formattedTime = (item.doorTime || item.time || '8:00 PM').trim();

    candidates.push({
      id: createCandidateId('structured'),
      sourceLane: 'structured',
      title,
      category: inferEventCategory({
        text: `${title} ${item.description || ''} ${venue}`,
        schemaType: item.category || item.type,
      }),
      venueName: venue,
      address,
      formattedDate,
      formattedTime,
      price,
      isFree,
      coverImage,
      coverImages: imageCandidates,
      sourceUrl: item.ticketUrl || page.url,
      organizerName: venue,
      organizerEmail: item.organizerEmail || item.email || '',
      rawSnippet: item.description?.slice(0, 300),
    });
  }

  return candidates;
}

/**
 * Master coordinator: runs the two-lane hybrid discovery pipeline.
 *
 * 1. Lane A — deterministic Schema.org JSON-LD extraction, Firecrawl structured JSON & Heuristic Snippet Mining (0 extra LLM cost)
 * 2. Lane B — Gemini deep-lane fallback for pages without structured data
 * 3. Cross-Domain Deduplication & Richness Merging
 * 4. Semantic curator — LLM enrichment (matchScore, vibeTags, tagline)
 * 5. Haversine distance enrichment against real user coordinates
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

  // Dispatch pages: use Schema.org, Firecrawl JSON, and Listing Snippet mining
  for (const page of scrapedPages) {
    const rawContent = page.rawHtml || '';
    const structured = extractStructuredEventsFromHtml(
      rawContent,
      page.url,
      page.ogImage,
      { weekendStart: targetWeekendRange.start, weekendEnd: targetWeekendRange.end }
    );

    const firecrawlStructured = parseFirecrawlJsonCandidates(page);

    // Heuristic snippet mining for calendar/directory listing aggregators
    let minedCandidates: CandidateEvent[] = [];
    if (structured.length === 0 || isListingPage(page.url, page.title)) {
      minedCandidates = mineListingEvents(page, 6);
    }

    if (structured.length > 0 || firecrawlStructured.length > 0 || minedCandidates.length > 0) {
      laneA_Candidates.push(...structured, ...firecrawlStructured, ...minedCandidates);
    } else {
      laneB_Pages.push(page);
    }
  }

  // Process Lane B if any pages lacked JSON-LD or mined items
  let laneB_Candidates: CandidateEvent[] = [];
  if (laneB_Pages.length > 0) {
    laneB_Candidates = await extractFromUnstructuredMarkdown(laneB_Pages, userPrompt, locationHint);
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
  const curatedEvents = await curateCandidatesWithLLM(allCandidates, userPrompt, userCoordinates);
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