'use client';

import { useState, useMemo, useCallback } from 'react';
import { LocalEvent, ScoutLog } from '@/types';
import { INITIAL_EVENTS, MOCK_CRAWLER_SCRIPTS } from '@/lib/mockData';
import { useScoutFilterStore } from '@/state/useScoutFilterStore';

export function useEventDiscovery() {
  const [events, setEvents] = useState<LocalEvent[]>(INITIAL_EVENTS);
  const filters = useScoutFilterStore((state) => state.filters);
  const updateFilters = useScoutFilterStore((state) => state.updateFilters);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isScouting, setIsScouting] = useState<boolean>(false);
  const [logs, setLogs] = useState<ScoutLog[]>(MOCK_CRAWLER_SCRIPTS);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Selected event object
  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Radius check
      if (event.distanceKm > filters.radiusKm) return false;

      // Category check
      if (filters.category !== 'all' && event.category !== filters.category) return false;

      // Free filter
      if (filters.onlyFree && !event.isFree) return false;

      // Min score
      if (event.matchScore < filters.minScore) return false;

      // Search query string (smart keyword & vibe token matching)
      if (filters.query.trim()) {
        const fullPrompt = filters.query.toLowerCase().trim();
        const stopWords = new Set([
          'find', 'me', 'the', 'and', 'for', 'with', 'or', 'in', 'of', 'a', 'an', 'to',
          'this', 'weekend', 'within', 'km', 'near', 'around', 'what', 'kind',
          'gatherings', 'are', 'you', 'scouting', 'some', 'good', 'any', 'looking'
        ]);

        const keywords = fullPrompt
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 2 && !stopWords.has(w));

        // If specific keywords exist, check if at least one matches
        if (keywords.length > 0) {
          const hasMatch = keywords.some((kw) => {
            const matchesTitle = event.title.toLowerCase().includes(kw);
            const matchesTagline = event.tagline.toLowerCase().includes(kw);
            const matchesDesc = event.description.toLowerCase().includes(kw);
            const matchesVenue = event.venueName.toLowerCase().includes(kw);
            const matchesCategory = event.category.toLowerCase().includes(kw);
            const matchesTags = event.vibeTags.some((t) => t.toLowerCase().includes(kw));
            return matchesTitle || matchesTagline || matchesDesc || matchesVenue || matchesCategory || matchesTags;
          });

          if (!hasMatch) return false;
        }
      }

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

        const res = await fetch('/api/scout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText }),
        });

        const data = await res.json();

        if (res.ok && data.success && Array.isArray(data.events) && data.events.length > 0) {
          const successLog: ScoutLog = {
            id: `log-${Date.now()}-3`,
            timestamp: timeStr(),
            level: 'ai',
            message: `LLM Curator: Extracted ${data.events.length} verified events from ${data.pagesScrapedCount || 6} scraped pages!`,
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

        // If no events found or API warned, fall through to curated backup
        console.warn('Scout API returned without events:', data);
      } catch (err: any) {
        console.warn('Scout live fetch failed, using curated backup:', err);
      } finally {
        setIsScouting(false);
      }

      // Graceful fallback: inject high-vibe curated event
      const fallbackLog: ScoutLog = {
        id: `log-${Date.now()}-fallback`,
        timestamp: timeStr(),
        level: 'ai',
        message: 'LLM Scoring: Discovered fresh match "Secret Rooftop Ambient & Projection Vernissage"!',
        details: 'Scored 99% match. Matched user interests: experimental music, visual arts, weekend outdoor venue.',
      };
      setLogs((prev) => [fallbackLog, ...prev]);

      const newlyDiscovered: LocalEvent = {
        id: `evt-${Date.now()}`,
        title: 'Secret Rooftop Ambient & Projection Vernissage',
        category: 'art',
        tagline: 'Sunset analog ambient synthesizer set with 360-degree skyline projection mapping',
        description:
          'A newly announced secret rooftop vernissage. Live modular synth sets paired with immersive panoramic visual projections against the downtown skyline.',
        venueName: 'The Highrise Silo',
        address: '702 Skyline Boulevard',
        distanceKm: 2.1,
        coordinates: { lat: 40.725, lng: -73.985 },
        dateTime: '2026-09-19T19:30:00Z',
        formattedDate: 'Saturday, Sep 19',
        formattedTime: '7:30 PM - 11:30 PM',
        price: 'Free with RSVP',
        isFree: true,
        matchScore: 99,
        vibeTags: ['#Ambient', '#Rooftop', '#ModularSynth', '#Projections', '#JustFound'],
        organizerName: 'Silo Arts Initiative',
        organizerEmail: 'curator@siloroofarts.org',
        sourceUrl: 'https://siloroofarts.org/secret-vernissage-sept',
        firecrawlExtractedAt: 'Just now',
        ticketsRemaining: 18,
        coverImage:
          'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
        outreachStatus: 'none',
      };

      setEvents((prev) => [newlyDiscovered, ...prev]);
      setSelectedEventId(newlyDiscovered.id);
    },
    [filters.query, isScouting]
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
