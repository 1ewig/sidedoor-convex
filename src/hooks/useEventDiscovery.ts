'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useConvexConfig } from '@/components/providers/ConvexClientProvider';
import { useSessionStore } from '@/state/useSessionStore';
import { useEventStore } from '@/state/useEventStore';
import { LocalEvent, ScoutLog, HybridDiscoveryStats } from '@/types';
import { useScoutFilterStore } from '@/state/useScoutFilterStore';
import { useLocationStore } from '@/state/useLocationStore';
import { matchesSearchFilters } from '@/lib/discovery/filters';
import { calculateHaversineDistanceKm } from '@/lib/geo';

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
  const removeBatch = useEventStore((state) => state.removeBatch);

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
  const runScoutAction = useAction(api.scout.run);
  const updateOutreachMutation = useMutation(api.events.updateOutreachStatus);

  // Derive merged event list reactively during render with dynamic distance recalculation
  const events = useMemo(() => {
    let merged: LocalEvent[];
    if (!convexEvents || !Array.isArray(convexEvents) || convexEvents.length === 0) {
      merged = scoutedEvents;
    } else {
      const convexMapped = convexEvents as unknown as LocalEvent[];
      const existingIds = new Set(scoutedEvents.map((e) => e.id));
      const uniqueConvex = convexMapped.filter((e) => !existingIds.has(e.id));
      merged = [...scoutedEvents, ...uniqueConvex];
    }

    const hasValidUserCoords =
      userCoordinates &&
      typeof userCoordinates.lat === 'number' &&
      typeof userCoordinates.lng === 'number' &&
      !isNaN(userCoordinates.lat) &&
      !isNaN(userCoordinates.lng) &&
      (userCoordinates.lat !== 0 || userCoordinates.lng !== 0);

    if (!hasValidUserCoords) return merged;

    return merged.map((event) => {
      if (
        event.coordinates &&
        typeof event.coordinates.lat === 'number' &&
        typeof event.coordinates.lng === 'number' &&
        (event.coordinates.lat !== 0 || event.coordinates.lng !== 0)
      ) {
        const distanceKm = calculateHaversineDistanceKm(
          userCoordinates.lat,
          userCoordinates.lng,
          event.coordinates.lat,
          event.coordinates.lng
        );
        return { ...event, distanceKm };
      }
      return event;
    });
  }, [convexEvents, scoutedEvents, userCoordinates]);

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

        if (!isConfigured) {
          throw new Error('SideDoor needs a Convex deployment before scouting can start.');
        }

        console.log(`🚀 Dispatching Convex scout action [Fast Scout, When: ${filters.when}]...`);
        const data = await runScoutAction({
          prompt: promptText,
          location: effectiveLocation,
          coordinates: userCoordinates,
          when: filters.when,
          country: countryCode,
          sessionId,
        });
        const clientDuration = ((performance.now() - clientStartTime) / 1000).toFixed(2);

        console.log(`📦 Received Convex action response in ${clientDuration}s:`, data);

        if (data.queries && Array.isArray(data.queries)) {
          console.log('🔍 Generated Search Angles:');
          data.queries.forEach((q: string, i: number) => console.log(`   ${i + 1}. ${q}`));
        }

        if (data.vibeTags && Array.isArray(data.vibeTags)) {
          console.log('🏷️ Extracted Vibe Tags:', data.vibeTags.join(', '));
        }

        if (data.stats) {
          const curationTime = 'curationTimeSec' in data.stats ? data.stats.curationTimeSec : 0;
          console.log('📊 Pipeline Telemetry:', {
            'Scraped Pages': data.pagesScrapedCount,
            'Fast Lane (JSON-LD)': data.stats.structuredCount,
            'Fallback Lane (Deep AI)': data.stats.unstructuredCount,
            'Curator Time (sec)': `${curationTime}s`,
            'Total Discovered': data.events?.length ?? 0,
          });
        }

        if (data.success && Array.isArray(data.events) && data.events.length > 0) {
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

          const batchId = `batch-${Date.now()}`;
          const scoutedAt = Date.now();
          const targetLocation = data.resolvedLocation || effectiveLocation;

          const taggedEvents: LocalEvent[] = data.events.map((e: LocalEvent) => ({
            ...e,
            batchId: e.batchId || batchId,
            searchPrompt: e.searchPrompt || promptText,
            searchLocation: e.searchLocation || targetLocation,
            scoutedAt: e.scoutedAt || scoutedAt,
          }));

          // Prepend newly discovered events to the persistent store
          appendScoutedEvents(taggedEvents);
          setIsFeedOpen(true);

          if (data.events[0]) {
            setSelectedEventId(data.events[0].id);
          }
          console.groupEnd();
          return;
        }

        // If no events found or API warned
        const warnMessage = ('message' in data && data.message) || 'No live gatherings found for this query.';
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
      runScoutAction,
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

  const dismissBatch = useCallback(
    (batchId: string) => {
      removeBatch(batchId);
    },
    [removeBatch]
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
    dismissBatch,
  };
}
