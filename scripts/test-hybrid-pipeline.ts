import dotenv from 'dotenv';
import { resolve } from 'path';
import FirecrawlApp from '@mendable/firecrawl-js';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { calculateHaversineDistanceKm } from '../src/lib/geo';
import { getTemporalContext } from '../src/lib/ai';
import { LocalEvent, EventCategory } from '../src/types';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const firecrawlKey = process.env.FIRECRAWL_API_KEY;
const googleKey =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GEMINI_API_KEY;

if (!firecrawlKey || firecrawlKey.includes('your_firecrawl_api_key')) {
  console.error('❌ Error: FIRECRAWL_API_KEY is missing or invalid in .env.local.');
  process.exit(1);
}

if (!googleKey || googleKey.includes('your_google_api_key')) {
  console.error('❌ Error: GOOGLE_GENERATIVE_AI_API_KEY is missing in .env.local.');
  process.exit(1);
}

// ==============================================================================
// 1. DATA STRUCTURES
// ==============================================================================

export interface CandidateEvent {
  id: string;
  sourceLane: 'structured' | 'unstructured';
  title: string;
  category?: EventCategory;
  venueName: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  isoDate?: string;
  formattedDate?: string;
  formattedTime?: string;
  price: string;
  isFree: boolean;
  coverImage?: string;
  sourceUrl: string;
  organizerName?: string;
  organizerEmail?: string;
  rawSnippet?: string;
}

// ==============================================================================
// 2. DETERMINISTIC PRE-PARSER (LANE A)
// ==============================================================================

function cleanHtmlText(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Extracts and traverses JSON-LD scripts from HTML.
 * Handles single objects, arrays, @graph, and ItemLists.
 */
export function extractStructuredEventsFromHtml(
  html: string,
  url: string,
  ogImage?: string,
  options?: {
    weekendStart?: Date;
    weekendEnd?: Date;
  }
): CandidateEvent[] {
  if (!html) return [];

  const scriptRegex = /<script\s+[^>]*?type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const candidates: CandidateEvent[] = [];
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const rawContent = match[1]?.trim();
    if (!rawContent) continue;

    try {
      const parsed = JSON.parse(rawContent);
      const itemsToInspect: any[] = [];

      function collectItems(node: any) {
        if (!node) return;
        if (Array.isArray(node)) {
          for (const item of node) collectItems(item);
          return;
        }
        if (typeof node !== 'object') return;

        // Flatten @graph
        if (node['@graph'] && Array.isArray(node['@graph'])) {
          for (const g of node['@graph']) collectItems(g);
        }

        // Flatten ItemList
        if (node.itemListElement && Array.isArray(node.itemListElement)) {
          for (const el of node.itemListElement) collectItems(el.item || el);
        }

        // Event match
        const type = node['@type'];
        const isEventType =
          typeof type === 'string'
            ? /Event/i.test(type)
            : Array.isArray(type)
            ? type.some((t) => /Event/i.test(t))
            : false;

        if (isEventType) {
          itemsToInspect.push(node);
        }
      }

      collectItems(parsed);

      for (let i = 0; i < itemsToInspect.length; i++) {
        const item = itemsToInspect[i];
        const title = cleanHtmlText(item.name || item.headline || item.summary);
        if (!title) continue;

        // Temporal filter (if date available)
        const startDateRaw = item.startDate || item.doorTime;
        let eventDate: Date | null = null;
        if (startDateRaw) {
          const d = new Date(startDateRaw);
          if (!isNaN(d.getTime())) {
            eventDate = d;
          }
        }

        console.log(`      ↳ Found JSON-LD event: "${title}" | Raw Date: ${startDateRaw}`);

        if (eventDate && options?.weekendStart && options?.weekendEnd) {
          // Allow leeway of 7 days around target window for testing/discovery
          const minDate = new Date(options.weekendStart.getTime() - 7 * 24 * 3600 * 1000);
          const maxDate = new Date(options.weekendEnd.getTime() + 14 * 24 * 3600 * 1000);
          if (eventDate < minDate || eventDate > maxDate) {
            console.log(`        ⚠️ Pruned by deterministic temporal filter (Event date: ${eventDate.toISOString()} outside window)`);
            continue;
          }
        }

        // Venue & Address
        const locationNode = item.location || {};
        const venueName = cleanHtmlText(
          typeof locationNode === 'string'
            ? locationNode
            : locationNode.name || 'Local Venue'
        );

        let address = '';
        if (typeof locationNode.address === 'string') {
          address = cleanHtmlText(locationNode.address);
        } else if (locationNode.address) {
          const addr = locationNode.address;
          const street = addr.streetAddress || '';
          const locality = addr.addressLocality || addr.addressRegion || '';
          address = cleanHtmlText([street, locality].filter(Boolean).join(', '));
        }

        // Coordinates
        let coordinates: { lat: number; lng: number } | undefined;
        const geo = locationNode.geo;
        if (geo) {
          const lat = parseFloat(geo.latitude);
          const lng = parseFloat(geo.longitude);
          if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            coordinates = { lat, lng };
          }
        }

        // Price & Free logic
        let price = 'Door / RSVP';
        let isFree = false;

        if (item.isAccessibleForFree === true) {
          isFree = true;
          price = 'Free Entry';
        } else if (item.offers) {
          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (offers) {
            const offerPrice = offers.price ?? offers.lowPrice;
            const currency = offers.priceCurrency || '$';
            if (offerPrice !== undefined) {
              if (offerPrice === 0 || offerPrice === '0' || String(offerPrice).toLowerCase() === 'free') {
                isFree = true;
                price = 'Free RSVP';
              } else {
                price = `${currency === 'USD' || currency === '$' ? '$' : currency}${offerPrice}`;
              }
            }
          }
        }

        if (!isFree && /free|pwyc|no cover|donation/i.test(price)) {
          isFree = true;
        }

        // Flyer image
        let coverImage = ogImage;
        if (item.image) {
          if (typeof item.image === 'string') {
            coverImage = item.image;
          } else if (Array.isArray(item.image) && typeof item.image[0] === 'string') {
            coverImage = item.image[0];
          } else if (item.image.url) {
            coverImage = item.image.url;
          }
        }

        // Formatted Date & Time
        let formattedDate = 'This Weekend';
        let formattedTime = '8:00 PM';
        if (eventDate) {
          formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          formattedTime = eventDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
        }

        // Organizer
        const organizerNode = item.organizer || item.performer;
        let organizerName = venueName;
        let organizerEmail = '';
        if (organizerNode) {
          const org = Array.isArray(organizerNode) ? organizerNode[0] : organizerNode;
          if (typeof org === 'string') {
            organizerName = org;
          } else if (org?.name) {
            organizerName = org.name;
          }
          if (org?.email) {
            organizerEmail = org.email;
          }
        }

        // Category inference
        let category: EventCategory = 'music';
        const itemType = item['@type'];
        const typeStr = Array.isArray(itemType) ? itemType.join(' ') : String(itemType || '');
        if (/Exhibition|VisualArts|Art/i.test(typeStr)) category = 'art';
        else if (/Food|SaleEvent|Market/i.test(typeStr)) category = 'market';
        else if (/Social|Community/i.test(typeStr)) category = 'community';
        else if (/Dance|Club|Nightlife/i.test(typeStr)) category = 'nightlife';

        candidates.push({
          id: `cand-${Date.now()}-${candidates.length + 1}`,
          sourceLane: 'structured',
          title,
          category,
          venueName,
          address: address || venueName,
          coordinates,
          isoDate: eventDate ? eventDate.toISOString() : undefined,
          formattedDate,
          formattedTime,
          price,
          isFree,
          coverImage,
          sourceUrl: item.url || url,
          organizerName,
          organizerEmail,
          rawSnippet: cleanHtmlText(item.description)?.slice(0, 300),
        });
      }
    } catch (err) {
      console.error('⚠️ Error inside extractStructuredEventsFromHtml:', err);
    }
  }

  return candidates;
}

// ==============================================================================
// 3. UNSTRUCTURED FALLBACK EXTRACTOR (LANE B)
// ==============================================================================

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
  pages: { url: string; title?: string; markdown: string; ogImage?: string }[],
  userPrompt: string,
  locationHint: string
): Promise<CandidateEvent[]> {
  if (pages.length === 0) return [];

  const { currentDateStr, weekendStr, monthYearStr } = getTemporalContext();

  const combined = pages
    .map((p, i) => {
      const img = p.ogImage ? `Cover Image: ${p.ogImage}\n` : '';
      return `### Source [${i + 1}]: ${p.title || 'Page'} (${p.url})\n${img}${p.markdown.slice(0, 15000)}`;
    })
    .join('\n\n---\n\n');

  const result = await generateObject({
    model: google('gemini-3.5-flash-lite'),
    schema: UnstructuredExtractionSchema,
    system: `You are SideDoor's fallback parser for unstructured DIY flyers, indie venue text, and linktrees.
Extract distinct events happening around: ${weekendStr} (${monthYearStr}).
Reference Date: ${currentDateStr}. Location: ${locationHint}.
Only extract real gatherings. Skip generic venue information or past events.`,
    prompt: `User Query: "${userPrompt}"\n\nContent:\n${combined}`,
  });

  return result.object.events.map((evt, idx) => ({
    id: `cand-unstruct-${Date.now()}-${idx + 1}`,
    sourceLane: 'unstructured',
    title: evt.title,
    category: evt.category as EventCategory,
    venueName: evt.venueName,
    address: evt.address,
    coordinates: evt.coordinates,
    formattedDate: evt.formattedDate,
    formattedTime: evt.formattedTime,
    price: evt.price,
    isFree: evt.isFree || /free|pwyc/i.test(evt.price),
    coverImage: pages[idx % pages.length]?.ogImage,
    sourceUrl: pages[idx % pages.length]?.url || '',
    organizerName: evt.organizerName || evt.venueName,
    organizerEmail: evt.organizerEmail || `booking@${evt.venueName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    rawSnippet: evt.description,
  }));
}

// ==============================================================================
// 4. UNIFIED SEMANTIC CURATOR (LLM ENRICHMENT)
// ==============================================================================

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
  userPrompt: string
): Promise<LocalEvent[]> {
  if (candidates.length === 0) return [];

  // Prepare a compact JSON array of candidates (less than 1,000 tokens total!)
  const compactCandidates = candidates.map((c) => ({
    id: c.id,
    title: c.title,
    venue: c.venueName,
    location: c.address,
    date: c.formattedDate,
    price: c.price,
    notes: c.rawSnippet || '',
  }));

  const systemPrompt = `You are SideDoor's Chief Culture Curator.
Your job is to semantically review candidate events against the user's inquiry: "${userPrompt}".
For each candidate:
1. Assign a matchScore (50-100) reflecting how authentically it matches the user's vibe intent.
2. Write a captivating, editorial 1-line tagline.
3. Write a vivid 2-sentence atmosphere overview.
4. Assign 3-4 aesthetic hashtags.
5. If the original candidate is missing a contact email, generate a reasonable booking contact (booking@<venue>.org).`;

  const curatorStart = Date.now();
  const result = await generateObject({
    model: google('gemini-3.5-flash-lite'),
    schema: SemanticCuratorSchema,
    system: systemPrompt,
    prompt: `Candidate Events for Curation:\n${JSON.stringify(compactCandidates, null, 2)}`,
  });
  const curatorElapsed = ((Date.now() - curatorStart) / 1000).toFixed(2);
  console.log(`⚡ Semantic Curator processed ${candidates.length} candidates in ${curatorElapsed}s!`);

  const lookup = new Map<string, (typeof result.object.curatedEvents)[0]>();
  for (const item of result.object.curatedEvents) {
    lookup.set(item.candidateId, item);
  }

  // Merge semantic output with deterministic facts
  const finalEvents: LocalEvent[] = [];

  for (const cand of candidates) {
    const curation = lookup.get(cand.id);
    // Discard candidates with matchScore < 60
    if (curation && curation.matchScore < 60) continue;

    finalEvents.push({
      id: cand.id.replace('cand-', 'evt-'),
      title: cand.title,
      category: (curation?.category || cand.category || 'music') as EventCategory,
      tagline: curation?.tagline || `Live at ${cand.venueName}`,
      description: curation?.editorialOverview || cand.rawSnippet || `Gathering hosted at ${cand.venueName}.`,
      venueName: cand.venueName,
      address: cand.address,
      distanceKm: 0, // Computed via Haversine later if user coords available
      coordinates: cand.coordinates || { lat: 40.7128, lng: -73.95 },
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

  // Sort by match score descending
  return finalEvents.sort((a, b) => b.matchScore - a.matchScore);
}

// ==============================================================================
// 5. MAIN END-TO-END VERIFICATION RUNNER
// ==============================================================================

async function runTest() {
  console.log('\n======================================================');
  console.log('   🧪 Testing Two-Lane Hybrid Scraping Architecture');
  console.log('======================================================\n');

  const app = new FirecrawlApp({ apiKey: firecrawlKey! });
  const userPrompt = process.argv[2] || 'intimate indie rock shows or underground synth pop in Brooklyn';
  const location = 'Brooklyn / NYC';
  const userCoords = { lat: 40.7182, lng: -73.9583 }; // Williamsburg, Brooklyn

  console.log(`🎯 Prompt:   "${userPrompt}"`);
  console.log(`📍 User:     ${location} (${userCoords.lat}, ${userCoords.lng})\n`);

  // Target Weekend calculation
  const now = new Date();
  const fridayOffset = (5 - now.getDay() + 7) % 7;
  const weekendStart = new Date(now);
  weekendStart.setDate(now.getDate() + (fridayOffset === 0 ? 0 : fridayOffset));
  weekendStart.setHours(0, 0, 0, 0);

  const weekendEnd = new Date(weekendStart);
  weekendEnd.setDate(weekendStart.getDate() + 3);
  weekendEnd.setHours(23, 59, 59, 999);

  console.log(`📅 Target Weekend Window: ${weekendStart.toDateString()} to ${weekendEnd.toDateString()}\n`);

  // STEP 1: Search with formats: ['markdown', 'rawHtml']
  console.log(`[1/4] Crawling real venues via Firecrawl (requesting 'markdown' + 'rawHtml')...`);
  const crawlStart = Date.now();

  const searchRes = await app.search(
    'site:eventbrite.com/e/ OR site:dice.fm/event/ OR site:ohmyrockness.com indie concerts Brooklyn',
    {
      limit: 3,
      scrapeOptions: {
        formats: ['markdown', 'rawHtml'],
      },
    }
  );

  const crawlElapsed = ((Date.now() - crawlStart) / 1000).toFixed(2);
  const webPages = (searchRes as any)?.web || [];
  console.log(`✅ Crawled ${webPages.length} live pages in ${crawlElapsed}s.\n`);

  // STEP 2: Dispatch to Two Lanes
  console.log(`[2/4] Running Step 2.5 Deterministic Pre-Parser (Lane A vs Lane B)...`);
  const laneA_Candidates: CandidateEvent[] = [];
  const laneB_Pages: { url: string; title?: string; markdown: string; ogImage?: string }[] = [];

  // Also include a representative DIY Venue event page with Schema.org JSON-LD for the active weekend
  const sampleStructuredHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Model Living, Admin & Funsucker Live at Alphaville</title>
        <meta property="og:image" content="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80">
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "MusicEvent",
          "name": "Model Living, Admin & Funsucker (Live)",
          "description": "Lo-fi garage rock, jangly basement riffs, and raw post-punk showcase in the heart of Bushwick.",
          "startDate": "${weekendStart.toISOString().split('T')[0]}T21:00:00-04:00",
          "doorTime": "${weekendStart.toISOString().split('T')[0]}T20:00:00-04:00",
          "location": {
            "@type": "Place",
            "name": "Alphaville",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "140 Wilson Ave",
              "addressLocality": "Brooklyn",
              "postalCode": "11237",
              "addressRegion": "NY"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": 40.7041,
              "longitude": -73.9242
            }
          },
          "offers": {
            "@type": "Offer",
            "price": "12.00",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "url": "https://alphaville.org/tickets"
          },
          "image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
          "organizer": {
            "@type": "Organization",
            "name": "Alphaville Booking",
            "email": "booking@alphavillebk.com"
          }
        }
        </script>
      </head>
      <body>
        <h1>Model Living Live at Alphaville</h1>
      </body>
    </html>
  `;

  // Prepend the structured venue page to webPages to test Lane A side-by-side with Lane B
  const allWebPages = [
    {
      url: 'https://alphavillebk.com/events/model-living-live',
      title: 'Model Living, Admin & Funsucker Live at Alphaville',
      rawHtml: sampleStructuredHtml,
      html: '',
      markdown: 'Model Living live show at Alphaville in Bushwick.',
      metadata: { ogImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80' },
    },
    ...webPages,
  ];

  for (const page of allWebPages) {
    const rawContent = (page as any).rawHtml || (page as any).html || '';
    const ogImage =
      page.metadata?.ogImage ||
      page.metadata?.['og:image'] ||
      (page.metadata as any)?.image;

    // Check if application/ld+json is anywhere in rawHtml
    const hasLdJson = /application\/ld\+json/i.test(rawContent);
    console.log(`   🔎 Inspecting ${page.url} (rawHtml length: ${rawContent.length}, has "application/ld+json": ${hasLdJson})`);

    // Check Lane A (Structured JSON-LD)
    const structured = extractStructuredEventsFromHtml(
      rawContent,
      page.url,
      ogImage,
      { weekendStart, weekendEnd }
    );

    if (structured.length > 0) {
      console.log(`   🟢 [Lane A: Structured] Extracted ${structured.length} JSON-LD events from: ${page.url}`);
      laneA_Candidates.push(...structured);
    } else {
      console.log(`   🟡 [Lane B: Deep-Lane] Forwarding ${page.url} to Unstructured LLM fallback`);
      laneB_Pages.push({
        url: page.url,
        title: page.title,
        markdown: page.markdown || '',
        ogImage,
      });
    }
  }

  // Process Lane B if any pages lacked JSON-LD
  let laneB_Candidates: CandidateEvent[] = [];
  if (laneB_Pages.length > 0) {
    console.log(`\n[3/4] Processing Lane B (${laneB_Pages.length} pages) via Gemini fallback parser...`);
    const laneBStart = Date.now();
    laneB_Candidates = await extractFromUnstructuredMarkdown(laneB_Pages, userPrompt, location);
    const laneBElapsed = ((Date.now() - laneBStart) / 1000).toFixed(2);
    console.log(`✅ Lane B extracted ${laneB_Candidates.length} candidates in ${laneBElapsed}s.`);
  } else {
    console.log(`\n[3/4] Lane B skipped (all crawled pages resolved through Lane A!)`);
  }

  // Collate All Candidates
  const allCandidates = [...laneA_Candidates, ...laneB_Candidates].slice(0, 6);
  console.log(`\nTotal Consolidated Candidates: ${allCandidates.length} (Lane A: ${laneA_Candidates.length}, Lane B: ${laneB_Candidates.length})`);

  // STEP 4: Semantic Enrichment
  console.log(`\n[4/4] Sending ${allCandidates.length} candidates to LLM Semantic Curator...`);
  const finalEvents = await curateCandidatesWithLLM(allCandidates, userPrompt);

  // Apply Haversine distance calculation deterministically
  const enrichedEvents = finalEvents.map((evt) => {
    if (evt.coordinates?.lat && evt.coordinates?.lng) {
      const dist = calculateHaversineDistanceKm(
        userCoords.lat,
        userCoords.lng,
        evt.coordinates.lat,
        evt.coordinates.lng
      );
      return { ...evt, distanceKm: dist };
    }
    return evt;
  });

  console.log('\n======================================================');
  console.log(`🎉 Two-Lane Hybrid Pipeline Success! (${enrichedEvents.length} Events Ready)`);
  console.log('======================================================\n');

  enrichedEvents.forEach((evt, i) => {
    console.log(`--- [Event #${i + 1}] ${evt.title} ---------------------`);
    console.log(`🏷️  Category:     ${evt.category.toUpperCase()}`);
    console.log(`✨  Match Score:  ${evt.matchScore}% | Tagline: "${evt.tagline}"`);
    console.log(`📍  Venue:        ${evt.venueName} (${evt.address})`);
    console.log(`📐  Distance:     ${evt.distanceKm} km away [Exact Haversine calculation]`);
    console.log(`🕒  Date & Time:  ${evt.formattedDate} • ${evt.formattedTime}`);
    console.log(`🎟️  Admission:    ${evt.price} (isFree: ${evt.isFree})`);
    console.log(`🏷️  Vibe Tags:    ${evt.vibeTags.join(' ')}`);
    console.log(`🖼️  Flyer Image:  ${evt.coverImage || 'None'}`);
    console.log(`✉️  AgentMail:    ${evt.organizerName} <${evt.organizerEmail}>`);
    console.log(`🔗  Source:       ${evt.sourceUrl}`);
    console.log(`⚡  Extraction:   ${evt.firecrawlExtractedAt}`);
    console.log(`📝  Overview:     "${evt.description}"\n`);
  });
}

runTest().catch((err) => {
  console.error('\n❌ Fatal Test Error:', err);
  process.exit(1);
});
