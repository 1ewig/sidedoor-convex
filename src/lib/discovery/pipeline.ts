import { LocalEvent } from '@/types';
import { CandidateEvent, HybridDiscoveryResult, ScrapedPageInput } from '@/types/discovery';
import { extractStructuredEventsFromHtml } from '../schema-org';
import { extractFromUnstructuredMarkdown } from './deep-lane';
import { curateCandidatesWithLLM } from './curator';
import { MAX_PIPELINE_CANDIDATES } from './config';
import { getTemporalContext } from '../temporal';
import { calculateHaversineDistanceKm } from '../geo';
import { createCandidateId } from './id';
import { inferEventCategory } from './category';

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
    const coverImage = item.imageUrl || page.ogImage;
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
 * 1. Lane A — deterministic Schema.org JSON-LD extraction & Firecrawl structured JSON (0 extra LLM cost)
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

  // Dispatch pages: use Schema.org and Firecrawl JSON if present, else fallback to Lane B
  for (const page of scrapedPages) {
    const rawContent = page.rawHtml || '';
    const structured = extractStructuredEventsFromHtml(
      rawContent,
      page.url,
      page.ogImage,
      { weekendStart: targetWeekendRange.start, weekendEnd: targetWeekendRange.end }
    );

    const firecrawlStructured = parseFirecrawlJsonCandidates(page);

    if (structured.length > 0 || firecrawlStructured.length > 0) {
      laneA_Candidates.push(...structured, ...firecrawlStructured);
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