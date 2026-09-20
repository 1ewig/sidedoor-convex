import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  events: defineTable({
    id: v.string(),
    title: v.string(),
    category: v.string(),
    tagline: v.string(),
    description: v.string(),
    venueName: v.string(),
    address: v.string(),
    distanceKm: v.optional(v.number()),
    coordinates: v.object({
      lat: v.number(),
      lng: v.number(),
    }),
    dateTime: v.string(),
    formattedDate: v.string(),
    formattedTime: v.string(),
    price: v.string(),
    isFree: v.boolean(),
    matchScore: v.number(),
    vibeTags: v.array(v.string()),
    organizerName: v.string(),
    organizerEmail: v.string(),
    sourceUrl: v.string(),
    firecrawlExtractedAt: v.string(),
    ticketsRemaining: v.optional(v.number()),
    coverImage: v.optional(v.string()),
    coverImages: v.optional(v.array(v.string())),
    outreachStatus: v.optional(
      v.union(v.literal('none'), v.literal('sent'), v.literal('replied'))
    ),
    sessionId: v.optional(v.string()),
  })
    .index('by_category', ['category'])
    .index('by_matchScore', ['matchScore'])
    .index('by_sourceUrl', ['sourceUrl'])
    .index('by_sessionId', ['sessionId']),

  threads: defineTable({
    sessionId: v.string(),
    eventId: v.string(),
    eventTitle: v.string(),
    organizerName: v.string(),
    organizerEmail: v.string(),
    agentEmail: v.string(),
    subject: v.string(),
    lastMessageAt: v.string(),
    status: v.union(v.literal('pending'), v.literal('responded'), v.literal('confirmed')),
    agentmailThreadId: v.optional(v.string()),
  })
    .index('by_sessionId', ['sessionId'])
    .index('by_session_and_event', ['sessionId', 'eventId'])
    .index('by_agentmailThreadId', ['agentmailThreadId']),

  messages: defineTable({
    threadId: v.id('threads'),
    sender: v.union(v.literal('agent'), v.literal('organizer')),
    senderName: v.string(),
    senderEmail: v.string(),
    subject: v.string(),
    body: v.string(),
    sentAt: v.string(),
    timestamp: v.number(),
  }).index('by_threadId', ['threadId']),

  scoutRuns: defineTable({
    sessionId: v.string(),
    prompt: v.string(),
    location: v.string(),
    scoutMode: v.string(),
    structuredCount: v.optional(v.number()),
    unstructuredCount: v.optional(v.number()),
    pagesScrapedCount: v.optional(v.number()),
    totalEventsFound: v.number(),
    durationSec: v.optional(v.number()),
    timestamp: v.string(),
  })
    .index('by_sessionId', ['sessionId'])
    .index('by_timestamp', ['timestamp']),
});
