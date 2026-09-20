'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useConvexConfig } from '@/components/providers/ConvexClientProvider';
import { useSessionStore } from '@/state/useSessionStore';
import { useEventStore } from '@/state/useEventStore';
import { LocalEvent, ScoutLog, HybridDiscoveryStats } from '@/types';
import { useScoutFilterStore } from '@/state/useScoutFilterStore';
import { useLocationStore } from '@/state/useLocationStore';
import { matchesSearchFilters } from '@/lib/discovery/filters';

export function useEventDiscovery() {
  const scoutedEvents = useEventStore((state) => state.scoutedEvents);
  const appendScoutedEvents = useEventStore((state) => state.appendScoutedEvents);
  const updateEventOutreachStatusInStore = useEventStore(
    (state) => state.updateEventOutreachStatus
  );
  const hybridStats = useEventStore((state) => state.hybridStats);
  const setHybridStats = useEventStore((state) => state.setHybridStats);
  const logs = useEventStore((state) => state.logs);
  const appendLog = useEventStore((state) => state.appendLog);
  const selectedEventId = useEventStore((state) => state.selectedEventId);
  const setSelectedEventId = useEventStore((state) => state.setSelectedEventId);
  const isFeedOpen = useEventStore((state) => state.isFeedOpen);
  const setIsFeedOpen = useEventStore((state) => state.setIsFeedOpen);

  const filters = useScoutFilterStore((state) => state.filters);
  const updateFilters = useScoutFilterStore((state) => state.updateFilters);
  const locationLabel = useLocationStore((state) => state.location.label);
  const userCoordinates = useLocationStore((state) => state.location.coordinates);
  const countryCode = useLocationStore((state) => state.location.countryCode);

  const sessionId = useSessionStore((state) => state.sessionId);
  const { isConfigured } = useConvexConfig();
  const convexEvents = useQuery(
    api.events.list,
    isConfigured && sessionId ? { sessionId } : 'skip'
  );
  const saveBatchMutation = useMutation(api.events.saveBatch);
  const updateOutreachMutation = useMutation(api.events.updateOutreachStatus);
  const logRunMutation = useMutation(api.scoutRuns.logRun);

  // Derive merged event list reactively during render
  const events = useMemo(() => {
    if (!convexEvents || !Array.isArray(convexEvents) || convexEvents.length === 0) {
      return scoutedEvents;
    }
    const convexMapped = convexEvents as unknown as LocalEvent[];
    const existingIds = new Set(scoutedEvents.map((e) => e.id));
    const uniqueConvex = convexMapped.filter((e) => !existingIds.has(e.id));
    return [...scoutedEvents, ...uniqueConvex];
  }, [convexEvents, scoutedEvents]);

  const [isScouting, setIsScouting] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Selected event object
  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  // Filtered events based on tuning preferences
  const filteredEvents = useMemo(() => {
    return events.filter((event) => matchesSearchFilters(event, filters));
  }, [events, filters]);

  // Trigger live multi-stage autonomous event discovery
  const triggerScout = useCallback(
    async (customPrompt?: string) => {
      if (isScouting) return;
      setIsScouting(true);
      setIsDrawerOpen(true);

      const promptText = (customPrompt || filters.query || 'indie gigs, night fleas, or art vernissages').trim();
      const timeStr = () => new Date().toLocaleTimeString('en-US', { hour12: false });
      const clientStartTime = performance.now();

      const effectiveLocation =
        locationLabel && locationLabel !== 'Detecting location...'
          ? locationLabel
          : 'Brooklyn / New York City';

      console.group(
        `%c🚦 [SideDoor Scout] Scouting: "${promptText}"`,
        'color: #d97706; font-weight: bold; font-size: 13px;'
      );
      console.log('📍 Location:', effectiveLocation);
      console.log('🌐 User Coordinates:', userCoordinates ?? 'Default (NYC fallback)');
      console.log('🌍 Target Country:', countryCode || 'US (auto)');
      console.log('⚙️ Current Active Filters:', {
        radiusKm: `${filters.radiusKm} km`,
        minScore: `${filters.minScore}%`,
        category: filters.category,
        onlyFree: filters.onlyFree,
        mode: filters.scoutMode,
        when: filters.when,
      });

      // Step 1: Query generation notice
      const startLog: ScoutLog = {
        id: `log-${Date.now()}-1`,
        timestamp: timeStr(),
        level: 'info',
        message: `Agent scouting (⚡ Fast • ${filters.when}): "${promptText}"`,
      };
      appendLog(startLog);

      try {
        // Step 2: Live search progress notice
        const crawlLog: ScoutLog = {
          id: `log-${Date.now()}-2`,
          timestamp: timeStr(),
          level: 'scrape',
          message: `⚡ Fast scan for ${filters.when} via venue calendars & JSON-LD...`,
        };
        appendLog(crawlLog);

        console.log(`🚀 Dispatching request to /api/scout [Fast Scout, When: ${filters.when}]...`);

        const res = await fetch('/api/scout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText,
            location: effectiveLocation,
            coordinates: userCoordinates,
            mode: filters.scoutMode,
            when: filters.when,
            country: countryCode,
          }),
        });

        const data = await res.json();
        const clientDuration = ((performance.now() - clientStartTime) / 1000).toFixed(2);

        console.log(`📦 Received response (${res.status}) in ${clientDuration}s:`, data);

        if (data.queries && Array.isArray(data.queries)) {
          console.log('🔍 Generated Search Angles:');
          data.queries.forEach((q: string, i: number) => console.log(`   ${i + 1}. ${q}`));
        }

        if (data.vibeTags && Array.isArray(data.vibeTags)) {
          console.log('🏷️ Extracted Vibe Tags:', data.vibeTags.join(', '));
        }

        if (data.stats) {
          console.log('📊 Pipeline Telemetry:', {
            'Scraped Pages': data.pagesScrapedCount,
            'Fast Lane (JSON-LD)': data.stats.structuredCount,
            'Fallback Lane (Deep AI)': data.stats.unstructuredCount,
            'Curator Time (sec)': `${data.stats.curationTimeSec}s`,
            'Total Discovered': data.events?.length ?? 0,
          });
        }

        if (res.ok && data.success && Array.isArray(data.events) && data.events.length > 0) {
          const stats = data.stats as HybridDiscoveryStats | undefined;
          if (stats) {
            setHybridStats(stats);
          }

          console.table(
            data.events.map((e: LocalEvent) => ({
              Title: e.title,
              Category: e.category,
              'Match %': `${e.matchScore}%`,
              Distance: `${e.distanceKm ?? 'N/A'} km`,
              Price: e.price,
              Venue: e.venueName,
              Date: `${e.formattedDate} ${e.formattedTime}`,
              Source: e.sourceUrl,
            }))
          );

          // Evaluation against active filters
          const passingEvents = data.events.filter((event: LocalEvent) =>
            matchesSearchFilters(event, filters)
          );

          console.log(
            `🎯 Filter Result: %c${passingEvents.length} of ${data.events.length} events%c visible under current filter drawer settings.`,
            'color: #10b981; font-weight: bold;',
            'color: inherit;'
          );

          const successLog: ScoutLog = {
            id: `log-${Date.now()}-3`,
            timestamp: timeStr(),
            level: 'ai',
            message: `Discovered ${data.events.length} gatherings via ⚡ Fast Scout in ${clientDuration}s!`,
            details: `Gatherings: ${data.events.map((e: LocalEvent) => e.title).slice(0, 3).join(', ')}.`,
          };
          appendLog(successLog);

          // Prepend newly discovered events to the persistent store
          appendScoutedEvents(data.events);
          setIsFeedOpen(true);

          // Persist discovered events and scout log to Convex if configured
          if (isConfigured) {
            saveBatchMutation({
              events: data.events.map((e: LocalEvent) => ({
                id: e.id,
                title: e.title,
                category: e.category,
                tagline: e.tagline,
                description: e.description,
                venueName: e.venueName,
                address: e.address,
                distanceKm: e.distanceKm,
                coordinates: e.coordinates,
                dateTime: e.dateTime,
                formattedDate: e.formattedDate,
                formattedTime: e.formattedTime,
                price: e.price,
                isFree: e.isFree,
                matchScore: e.matchScore,
                vibeTags: e.vibeTags,
                organizerName: e.organizerName,
                organizerEmail: e.organizerEmail,
                sourceUrl: e.sourceUrl,
                firecrawlExtractedAt: e.firecrawlExtractedAt,
                ticketsRemaining: e.ticketsRemaining,
                coverImage: e.coverImage,
                coverImages: e.coverImages,
                outreachStatus: e.outreachStatus || 'none',
                sessionId,
              })),
            }).catch((err: unknown) => {
              console.warn('⚠️ [Convex] Failed to save events batch:', err);
            });

            logRunMutation({
              sessionId,
              prompt: promptText,
              location: effectiveLocation,
              scoutMode: filters.scoutMode,
              structuredCount: data.stats?.structuredCount,
              unstructuredCount: data.stats?.unstructuredCount,
              pagesScrapedCount: data.pagesScrapedCount,
              totalEventsFound: data.events.length,
              durationSec: Number(clientDuration),
            }).catch((err: unknown) => {
              console.warn('⚠️ [Convex] Failed to log scout run:', err);
            });
          }

          if (data.events[0]) {
            setSelectedEventId(data.events[0].id);
          }
          console.groupEnd();
          return;
        }

        // If no events found or API warned
        const warnMessage = data.error || data.message || 'No live gatherings found for this query.';
        console.warn('⚠️ Scout Warning:', warnMessage);
        const warnLog: ScoutLog = {
          id: `log-${Date.now()}-warn`,
          timestamp: timeStr(),
          level: 'info',
          message: `Scout report: ${warnMessage}`,
        };
        appendLog(warnLog);
        console.groupEnd();
      } catch (err: unknown) {
        console.error('❌ Scout Pipeline Error:', err);
        const errMessage = err instanceof Error ? err.message : 'Network error';
        const errLog: ScoutLog = {
          id: `log-${Date.now()}-err`,
          timestamp: timeStr(),
          level: 'info',
          message: `Scout pipeline connection error: ${errMessage}`,
        };
        appendLog(errLog);
        console.groupEnd();
      } finally {
        setIsScouting(false);
      }
    },
    [
      appendLog,
      appendScoutedEvents,
      countryCode,
      filters,
      isConfigured,
      isScouting,
      locationLabel,
      logRunMutation,
      saveBatchMutation,
      sessionId,
      setHybridStats,
      setIsFeedOpen,
      setSelectedEventId,
      userCoordinates,
    ]
  );

  const markEventOutreach = useCallback(
    (eventId: string) => {
      updateEventOutreachStatusInStore(eventId, 'sent');
      if (isConfigured) {
        updateOutreachMutation({ eventId, status: 'sent' }).catch(
          (err: unknown) => {
            console.warn('⚠️ [Convex] Failed to update outreach status:', err);
          }
        );
      }
    },
    [isConfigured, updateEventOutreachStatusInStore, updateOutreachMutation]
  );

  return {
    events: filteredEvents,
    allEventsCount: events.length,
    selectedEvent,
    selectedEventId,
    setSelectedEventId,
    filters,
    updateFilters,
    isScouting,
    logs,
    hybridStats,
    isDrawerOpen,
    setIsDrawerOpen,
    isFeedOpen,
    setIsFeedOpen,
    triggerScout,
    markEventOutreach,
  };
}
