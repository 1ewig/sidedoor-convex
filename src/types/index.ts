export type EventCategory = 'music' | 'art' | 'market' | 'food' | 'community' | 'nightlife';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocalEvent {
  id: string;
  title: string;
  category: EventCategory;
  tagline: string;
  description: string;
  venueName: string;
  address: string;
  distanceKm: number;
  coordinates: Coordinates;
  dateTime: string;
  formattedDate: string;
  formattedTime: string;
  price: string;
  isFree: boolean;
  matchScore: number; // 0 - 100
  vibeTags: string[];
  organizerName: string;
  organizerEmail: string;
  sourceUrl: string;
  firecrawlExtractedAt: string;
  ticketsRemaining?: number;
  coverImage?: string;
  outreachStatus?: 'none' | 'sent' | 'replied';
}

export interface ScoutLog {
  id: string;
  timestamp: string;
  level: 'info' | 'scrape' | 'ai' | 'mail' | 'success';
  message: string;
  details?: string;
}

export interface EmailMessage {
  id: string;
  sender: 'agent' | 'organizer';
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  sentAt: string;
}

export interface EmailThread {
  id: string;
  eventId: string;
  eventTitle: string;
  organizerName: string;
  organizerEmail: string;
  agentEmail: string;
  subject: string;
  lastMessageAt: string;
  status: 'pending' | 'responded' | 'confirmed';
  messages: EmailMessage[];
}

export type ScoutEngineMode = 'fast' | 'deep';

export interface SearchFilterState {
  query: string;
  radiusKm: number;
  category: string;
  onlyFree: boolean;
  minScore: number;
  scoutMode: ScoutEngineMode;
}

export interface UserLocation {
  label: string;
  coordinates: Coordinates;
}

export interface HybridDiscoveryStats {
  structuredCount: number;
  unstructuredCount: number;
  pagesScrapedCount: number;
  curationTimeSec?: number;
  scoutMode?: ScoutEngineMode;
  totalDurationSec?: number;
}

export * from './discovery';
