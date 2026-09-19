/**
 * Plain JSON Schema definitions for Firecrawl extraction.
 *
 * NOTE: Firecrawl SDK v4 uses internal serializers that are incompatible
 * with Zod 4 instances, causing silent null extraction results.
 * Using standard JSON Schema objects guarantees 100% reliable extraction.
 */

export const FIRECRAWL_EVENT_LIST_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      description: 'List of upcoming local gatherings, concerts, vernissages, or flea markets',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title, band name, or exhibition headline' },
          venue: { type: 'string', description: 'Venue, gallery, or space name' },
          address: { type: 'string', description: 'Street address or neighborhood' },
          date: { type: 'string', description: 'Event date (e.g. Saturday, Sep 19 or 2026-09-19)' },
          time: { type: 'string', description: 'Door or start time (e.g. 8:00 PM)' },
          price: { type: 'string', description: 'Ticket or door price (e.g. $15, Free RSVP, PWYC)' },
          isFree: { type: 'boolean', description: 'Whether admission is free or donation-based' },
          description: { type: 'string', description: '1-2 sentence description of the gathering' },
          ticketUrl: { type: 'string', description: 'Direct ticketing or RSVP link if available' },
          imageUrl: { type: 'string', description: 'Direct flyer or event photo URL if present' },
        },
        required: ['title'],
      },
    },
  },
} as const;

export const FIRECRAWL_SINGLE_EVENT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Event title or headline act' },
    venue: { type: 'string', description: 'Venue, gallery, or space name' },
    address: { type: 'string', description: 'Full street address or neighborhood' },
    date: { type: 'string', description: 'Event date (e.g. Saturday, Sep 19 or 2026-09-19)' },
    doorTime: { type: 'string', description: 'Door or start time (e.g. 8:00 PM)' },
    price: { type: 'string', description: 'Ticket price (e.g. $15, Free, or PWYC)' },
    isFree: { type: 'boolean', description: 'Whether the event is free' },
    description: { type: 'string', description: 'Short atmospheric description or artist bio' },
    ticketUrl: { type: 'string', description: 'Direct ticket link' },
    imageUrl: { type: 'string', description: 'Flyer image link' },
    lineup: {
      type: 'array',
      items: { type: 'string' },
      description: 'Supporting bands or featured artists',
    },
  },
  required: ['title', 'venue'],
} as const;

export const FIRECRAWL_EVENT_EXTRACTION_PROMPT =
  'Extract upcoming local live events, concerts, gallery vernissages, night markets, and small-door gatherings. Include title, venue, full address, date, door time, price, isFree status, and description.';

export const FIRECRAWL_PERMALINK_EXTRACTION_PROMPT =
  'Extract the specific event details on this page: title, venue name, street address, date, door time, ticket price, free status, flyer image, and description.';
