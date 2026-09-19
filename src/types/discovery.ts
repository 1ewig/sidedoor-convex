import { EventCategory, LocalEvent } from './index';

/**
 * Shared contracts for the two-lane hybrid discovery pipeline.
 * Consumed by src/lib/schema-org.ts (Lane A), src/lib/discovery/* (Lane B + curator), and /api/scout.
 */

export interface ScrapedPageInput {
  url: string;
  title?: string;
  markdown: string;
  rawHtml?: string;
  ogImage?: string;
}

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

export interface HybridDiscoveryResult {
  events: LocalEvent[];
  stats: {
    structuredCount: number;
    unstructuredCount: number;
    pagesScrapedCount: number;
    curationTimeSec?: number;
  };
}