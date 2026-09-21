import { query, mutation } from './_generated/server';
import { Doc } from './_generated/dataModel';
import { v } from 'convex/values';

export const list = query({
  args: {
    category: v.optional(v.string()),
    minScore: v.optional(v.number()),
    onlyFree: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results: Doc<'events'>[];

    if (args.sessionId) {
      results = await ctx.db
        .query('events')
        .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId!))
        .collect();
    } else if (args.category && args.category !== 'all') {
      results = await ctx.db
        .query('events')
        .withIndex('by_category', (q) => q.eq('category', args.category!))
        .collect();
    } else {
      results = await ctx.db.query('events').collect();
    }

    if (args.minScore !== undefined) {
      results = results.filter((e) => e.matchScore >= args.minScore!);
    }

    if (args.onlyFree) {
      results = results.filter((e) => e.isFree);
    }

    // Sort descending by matchScore
    results.sort((a, b) => b.matchScore - a.matchScore);

    if (args.limit) {
      return results.slice(0, args.limit);
    }

    return results;
  },
});

export const saveBatch = mutation({
  args: {
    events: v.array(
      v.object({
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
        batchId: v.optional(v.string()),
        searchPrompt: v.optional(v.string()),
        searchLocation: v.optional(v.string()),
        scoutedAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    let insertedCount = 0;
    let updatedCount = 0;

    for (const event of args.events) {
      // Check if event exists by sourceUrl
      const existing = await ctx.db
        .query('events')
        .withIndex('by_sourceUrl', (q) => q.eq('sourceUrl', event.sourceUrl))
        .first();

      if (existing) {
        // Update existing record with fresh fields while preserving user outreach status if set
        await ctx.db.patch(existing._id, {
          ...event,
          outreachStatus: existing.outreachStatus || event.outreachStatus || 'none',
        });
        updatedCount++;
      } else {
        await ctx.db.insert('events', {
          ...event,
          outreachStatus: event.outreachStatus || 'none',
        });
        insertedCount++;
      }
    }

    return { insertedCount, updatedCount };
  },
});

export const updateOutreachStatus = mutation({
  args: {
    eventId: v.string(),
    status: v.union(v.literal('none'), v.literal('sent'), v.literal('replied')),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query('events')
      .filter((q) => q.eq(q.field('id'), args.eventId))
      .first();

    if (event) {
      await ctx.db.patch(event._id, { outreachStatus: args.status });
      return { success: true };
    }

    return { success: false, error: 'Event not found' };
  },
});
