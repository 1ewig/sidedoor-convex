'use client';

import { useState, useMemo, useCallback } from 'react';
import { LocalEvent, ScoutLog } from '@/types';
import { useScoutFilterStore } from '@/state/useScoutFilterStore';
import { useLocationStore } from '@/state/useLocationStore';

export function useEventDiscovery() {
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const filters = useScoutFilterStore((state) => state.filters);
  const updateFilters = useScoutFilterStore((state) => state.updateFilters);
  const locationLabel = useLocationStore((state) => state.location.label);
  const userCoordinates = useLocationStore((state) => state.location.coordinates);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isScouting, setIsScouting] = useState<boolean>(false);
  const [logs, setLogs] = useState<ScoutLog[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Selected event object
  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  // Filtered events based on tuning preferences
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Radius check
      if (event.distanceKm > filters.radiusKm) return false;

      // Category check
      if (filters.category !== 'all' && event.category !== filters.category) return false;

      // Free filter
      if (filters.onlyFree && !event.isFree) return false;

      // Min score check
      if (event.matchScore < filters.minScore) return false;

      return true;
    });
  }, [events, filters]);

  // Trigger live multi-stage autonomous event discovery
  const triggerScout = useCallback(
    async (customPrompt?: string) => {
      if (isScouting) return;
      setIsScouting(true);
      setIsDrawerOpen(true);

      const promptText = (customPrompt || filters.query || 'indie gigs, night fleas, or art vernissages').trim();
      const timeStr = () => new Date().toLocaleTimeString('en-US', { hour12: false });

      // Step 1: Query generation notice
      const startLog: ScoutLog = {
        id: `log-${Date.now()}-1`,
        timestamp: timeStr(),
        level: 'info',
        message: `Agent initiated 3-stage discovery for: "${promptText}"`,
      };
      setLogs((prev) => [startLog, ...prev]);

      try {
        // Step 2: Firecrawl crawl progress notice
        const crawlLog: ScoutLog = {
          id: `log-${Date.now()}-2`,
          timestamp: timeStr(),
          level: 'scrape',
          message: 'Firecrawl API: Crawling 3 distinct query angles across indie calendars & DIY venues...',
        };
        setLogs((prev) => [crawlLog, ...prev]);

        const effectiveLocation =
          locationLabel && locationLabel !== 'Detecting location...'
            ? locationLabel
            : undefined;

        const res = await fetch('/api/scout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText,
            location: effectiveLocation,
            coordinates: userCoordinates,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success && Array.isArray(data.events) && data.events.length > 0) {
          const stats = data.stats;
          const statsInfo = stats
            ? ` (${stats.structuredCount} via Schema.org JSON-LD, ${stats.unstructuredCount} via DIY Deep-Lane in ${stats.curationTimeSec || 2}s)`
            : '';
          const successLog: ScoutLog = {
            id: `log-${Date.now()}-3`,
            timestamp: timeStr(),
            level: 'ai',
            message: `Two-Lane Hybrid Scout: Extracted ${data.events.length} verified events${statsInfo}!`,
            details: `Discovered: ${data.events.map((e: LocalEvent) => e.title).slice(0, 3).join(', ')}.`,
          };
          setLogs((prev) => [successLog, ...prev]);

          // Prepend newly discovered events to the feed
          setEvents((prev) => {
            const existingIds = new Set(prev.map((e) => e.id));
            const freshEvents = data.events.filter((e: LocalEvent) => !existingIds.has(e.id));
            return [...freshEvents, ...prev];
          });

          if (data.events[0]) {
            setSelectedEventId(data.events[0].id);
          }
          return;
        }

        // If no events found or API warned
        const warnMessage = data.error || data.message || 'No live gatherings found for this query.';
        const warnLog: ScoutLog = {
          id: `log-${Date.now()}-warn`,
          timestamp: timeStr(),
          level: 'info',
          message: `Scout report: ${warnMessage}`,
        };
        setLogs((prev) => [warnLog, ...prev]);
      } catch (err: any) {
        const errLog: ScoutLog = {
          id: `log-${Date.now()}-err`,
          timestamp: timeStr(),
          level: 'info',
          message: `Scout pipeline connection error: ${err?.message || 'Network error'}`,
        };
        setLogs((prev) => [errLog, ...prev]);
      } finally {
        setIsScouting(false);
      }
    },
    [filters.query, isScouting, locationLabel, userCoordinates]
  );

  const markEventOutreach = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === eventId ? { ...evt, outreachStatus: 'sent' } : evt
      )
    );
  }, []);

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
    isDrawerOpen,
    setIsDrawerOpen,
    triggerScout,
    markEventOutreach,
  };
}
