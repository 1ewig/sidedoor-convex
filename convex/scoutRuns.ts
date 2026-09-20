import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const listRecent = query({
  args: {
    sessionId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    if (args.sessionId) {
      const runs = await ctx.db
        .query('scoutRuns')
        .withIndex('by_sessionId', (q) => q.eq('sessionId', args.sessionId!))
        .order('desc')
        .take(limit);
      return runs;
    }

    const runs = await ctx.db
      .query('scoutRuns')
      .order('desc')
      .take(limit);

    return runs;
  },
});

export const logRun = mutation({
  args: {
    sessionId: v.string(),
    prompt: v.string(),
    location: v.string(),
    scoutMode: v.string(),
    structuredCount: v.optional(v.number()),
    unstructuredCount: v.optional(v.number()),
    pagesScrapedCount: v.optional(v.number()),
    totalEventsFound: v.number(),
    durationSec: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const runId = await ctx.db.insert('scoutRuns', {
      sessionId: args.sessionId,
      prompt: args.prompt,
      location: args.location,
      scoutMode: args.scoutMode,
      structuredCount: args.structuredCount,
      unstructuredCount: args.unstructuredCount,
      pagesScrapedCount: args.pagesScrapedCount,
      totalEventsFound: args.totalEventsFound,
      durationSec: args.durationSec,
      timestamp: new Date().toISOString(),
    });

    return runId;
  },
});
