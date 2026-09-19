import { EventCategory } from '@/types';
import { CandidateEvent } from '@/types/discovery';
import { cleanHtmlText } from './html';
import { createCandidateId } from './discovery/id';

/**
 * Lane A: Deterministic Schema.org / JSON-LD pre-parser.
 * Pure HTML-in / candidates-out. No LLM, no network, no API key.
 * Supports flat Event objects, arrays, @graph, and ItemLists with deterministic temporal pruning.
 */

interface StructuredExtractionOptions {
  weekendStart?: Date;
  weekendEnd?: Date;
}

export function extractStructuredEventsFromHtml(
  rawHtml: string,
  url: string,
  ogImage?: string,
  options?: StructuredExtractionOptions
): CandidateEvent[] {
  if (!rawHtml) return [];

  const scriptRegex = /<script\s+[^>]*?type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const candidates: CandidateEvent[] = [];
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(rawHtml)) !== null) {
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

      for (const item of itemsToInspect) {
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

        if (eventDate && options?.weekendStart && options?.weekendEnd) {
          // Allow leeway of 7 days around target window
          const minDate = new Date(options.weekendStart.getTime() - 7 * 24 * 3600 * 1000);
          const maxDate = new Date(options.weekendEnd.getTime() + 14 * 24 * 3600 * 1000);
          if (eventDate < minDate || eventDate > maxDate) {
            // Out of timeframe, discard deterministically
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

        appendStructuredCandidate(
          candidates,
          item,
          {
            title,
            eventDate,
            venueName,
            address,
            coordinates,
            ogImage,
            url,
          }
        );
      }
    } catch {
      // Skip malformed script tags
    }
  }

  return candidates;
}
// ---------------------------------------------------------------------
// Candidate construction (price, imagery, schedule, organizer, category)
// ---------------------------------------------------------------------

interface ParsedEventFields {
  title: string;
  eventDate: Date | null;
  venueName: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  ogImage?: string;
  url: string;
}

function appendStructuredCandidate(
  candidates: CandidateEvent[],
  item: any,
  parsed: ParsedEventFields
): void {
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
  let coverImage = parsed.ogImage;
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
  if (parsed.eventDate) {
    formattedDate = parsed.eventDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    formattedTime = parsed.eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  // Organizer
  const organizerNode = item.organizer || item.performer;
  let organizerName = parsed.venueName;
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
    id: createCandidateId('structured'),
    sourceLane: 'structured',
    title: parsed.title,
    category,
    venueName: parsed.venueName,
    address: parsed.address || parsed.venueName,
    coordinates: parsed.coordinates,
    isoDate: parsed.eventDate ? parsed.eventDate.toISOString() : undefined,
    formattedDate,
    formattedTime,
    price,
    isFree,
    coverImage,
    sourceUrl: item.url || parsed.url,
    organizerName,
    organizerEmail,
    rawSnippet: cleanHtmlText(item.description)?.slice(0, 300),
  });
}