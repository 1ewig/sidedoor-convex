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

  // Trigger continuous discovery simulation
  const triggerScout = useCallback(
    (customPrompt?: string) => {
      if (isScouting) return;
      setIsScouting(true);
      setIsDrawerOpen(true);

      const promptText = customPrompt || filters.query;
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });

      const newLog1: ScoutLog = {
        id: `log-${Date.now()}-1`,
        timestamp: timeStr,
        level: 'info',
        message: `Agent initiated continuous crawl for: "${promptText}"`,
      };

      setLogs((prev) => [newLog1, ...prev]);

      setTimeout(() => {
        const newLog2: ScoutLog = {
          id: `log-${Date.now()}-2`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          level: 'scrape',
          message: 'Firecrawl API: Crawling 6 venue sub-pages & Instagram linktrees...',
          details: 'Extracted raw events markdown from Bowery Ballroom, Market Collective, and Local Gallery listings.',
        };
        setLogs((prev) => [newLog2, ...prev]);
      }, 1200);

      setTimeout(() => {
        const newLog3: ScoutLog = {
          id: `log-${Date.now()}-3`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          level: 'ai',
          message: 'LLM Scoring: Discovered fresh high-vibe match "Secret Rooftop Ambient & Projection Vernissage"!',
          details: 'Scored 99% match. Matched user interests: experimental music, visual arts, weekend outdoor venue.',
        };
        setLogs((prev) => [newLog3, ...prev]);

        // Inject new event into the feed
        const newlyDiscovered: LocalEvent = {
          id: `evt-${Date.now()}`,
          title: 'Secret Rooftop Ambient & Projection Vernissage',
          category: 'art',
          tagline: 'Sunset analog ambient synthesizer set with 360-degree skyline projection mapping',
          description: 'A newly announced secret rooftop vernissage. Live modular synth sets paired with immersive panoramic visual projections against the downtown skyline.',
          venueName: 'The Highrise Silo',
          address: '702 Skyline Boulevard',
          distanceKm: 2.1,
          coordinates: { lat: 40.7250, lng: -73.9850 },
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
          coverImage: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80',
          outreachStatus: 'none',
        };

        setEvents((prev) => [newlyDiscovered, ...prev]);
        setSelectedEventId(newlyDiscovered.id);
        setIsScouting(false);
      }, 2600);
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
