"use node";

import { action } from './_generated/server';
import { v } from 'convex/values';
import { api } from './_generated/api';
import { executeScoutCrawl } from '../src/lib/discovery/scout-engine';
import { runHybridEventDiscovery } from '../src/lib/discovery/pipeline';
import type { LocalEvent } from '../src/types';

const coordinatesValidator = v.object({
  lat: v.number(),
  lng: v.number(),
});

/**
 * Runs the full SideDoor discovery pipeline inside Convex. Keeping this work in
 * an action means Firecrawl and Gemini credentials never reach the static app.
 */
export const run = action({
  args: {
    prompt: v.string(),
    location: v.string(),
    coordinates: v.optional(coordinatesValidator),
    country: v.optional(v.string()),
    when: v.optional(v.string()),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const startedAt = Date.now();
    const prompt = args.prompt.trim();
    const location = args.location.trim() || 'Brooklyn / New York City';

    if (!prompt) {
      throw new Error('A search prompt is required.');
    }

    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    const googleKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY;

    if (!firecrawlKey || firecrawlKey.includes('your_firecrawl_api_key')) {
      throw new Error('FIRECRAWL_API_KEY is not configured in Convex.');
    }

    if (!googleKey || googleKey.includes('your_google_api_key')) {
      throw new Error('Google Gemini API key is not configured in Convex.');
    }

    const crawlStartedAt = Date.now();
    const { allScrapedPages, queriesUsed, vibeTags, resolvedLocation } = await executeScoutCrawl({
      prompt,
      location,
      firecrawlKey,
      country: args.country,
      when: args.when,
    });
    const crawlDurationSec = Number(((Date.now() - crawlStartedAt) / 1000).toFixed(2));
    const effectiveLocation = resolvedLocation || location;

    if (allScrapedPages.length === 0) {
      const totalDurationSec = Number(((Date.now() - startedAt) / 1000).toFixed(2));
      await ctx.runMutation(api.scoutRuns.logRun, {
        sessionId: args.sessionId,
        prompt,
        location: effectiveLocation,
        scoutMode: 'fast',
        pagesScrapedCount: 0,
        totalEventsFound: 0,
        durationSec: totalDurationSec,
      });

      return {
        success: true,
        events: [],
        queries: queriesUsed,
        vibeTags,
        resolvedLocation: effectiveLocation,
        message: 'No web pages found matching query.',
        pagesScrapedCount: 0,
        stats: {
          structuredCount: 0,
          unstructuredCount: 0,
          pagesScrapedCount: 0,
          scoutMode: 'fast',
          crawlDurationSec,
          curationTimeSec: 0,
          discoveryDurationSec: 0,
          totalDurationSec,
        },
      };
    }

    const discoveryStartedAt = Date.now();
    const discovery = await runHybridEventDiscovery(
      allScrapedPages,
      prompt,
      effectiveLocation,
      args.coordinates
    );
    const discoveryDurationSec = Number(((Date.now() - discoveryStartedAt) / 1000).toFixed(2));
    const totalDurationSec = Number(((Date.now() - startedAt) / 1000).toFixed(2));
    const batchId = `batch-${startedAt}`;

    const events: LocalEvent[] = discovery.events.map((event) => ({
      ...event,
      batchId: event.batchId || batchId,
      searchPrompt: event.searchPrompt || prompt,
      searchLocation: event.searchLocation || effectiveLocation,
      scoutedAt: event.scoutedAt || startedAt,
    }));

    await ctx.runMutation(api.events.saveBatch, {
      events: events.map((event) => ({
        ...event,
        outreachStatus: event.outreachStatus || 'none',
        sessionId: args.sessionId,
      })),
    });
    await ctx.runMutation(api.scoutRuns.logRun, {
      sessionId: args.sessionId,
      prompt,
      location: effectiveLocation,
      scoutMode: 'fast',
      structuredCount: discovery.stats.structuredCount,
      unstructuredCount: discovery.stats.unstructuredCount,
      pagesScrapedCount: allScrapedPages.length,
      totalEventsFound: events.length,
      durationSec: totalDurationSec,
    });

    return {
      success: true,
      events,
      queries: queriesUsed,
      vibeTags,
      resolvedLocation: effectiveLocation,
      pagesScrapedCount: allScrapedPages.length,
      stats: {
        ...discovery.stats,
        scoutMode: 'fast',
        crawlDurationSec,
        discoveryDurationSec,
        totalDurationSec,
      },
    };
  },
});
