'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useConvexConfig } from '@/components/providers/ConvexClientProvider';
import { useEventStore } from '@/state/useEventStore';
import { useScoutFilterStore } from '@/state/useScoutFilterStore';
import { useAgentMail } from '@/hooks/useAgentMail';
import { useUserLocation } from '@/hooks/useUserLocation';
import { calculateHaversineDistanceKm } from '@/lib/geo';
import { ShadowOverlay } from '@/components/layout/ShadowOverlay';
import { Header } from '@/components/layout/Header';
import { RadarHero } from '@/components/radar/RadarHero';
import { RadarFilterBar } from '@/components/radar/RadarFilterBar';
import { RadarGrid } from '@/components/radar/RadarGrid';
import { OutboxDrawer } from '@/components/drawers/OutboxDrawer';
import { ScoutFilterDrawer } from '@/components/drawers/ScoutFilterDrawer';
import { LocationPinModal } from '@/components/location/LocationPinModal';
import { EventDetailModal } from '@/components/discovery/EventDetailModal';
import { LocalEvent } from '@/types';

export function RadarPageClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<LocalEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const filters = useScoutFilterStore((state) => state.filters);
  const updateFilters = useScoutFilterStore((state) => state.updateFilters);
  const resetFilters = useScoutFilterStore((state) => state.resetFilters);
  const isFilterDrawerOpen = useScoutFilterStore((state) => state.isFilterDrawerOpen);
  const setFilterDrawerOpen = useScoutFilterStore((state) => state.setFilterDrawerOpen);

  const { isConfigured } = useConvexConfig();
  const localScoutedEvents = useEventStore((state) => state.scoutedEvents);
  const updateEventOutreachStatus = useEventStore((state) => state.updateEventOutreachStatus);

  // Global unearthings query from Convex (Option A: Global Cultural Wire)
  const convexEvents = useQuery(
    api.events.list,
    isConfigured ? { limit: 100 } : 'skip'
  );

  const {
    threads,
    unreadCount,
    sendEventInquiry,
    replyToThread,
  } = useAgentMail();

  const {
    location,
    isLocating,
    error: locationError,
    locateMe,
    setCustomLocation,
  } = useUserLocation();

  // Merge Convex events with any local events
  const allEvents = useMemo(() => {
    if (!convexEvents || !Array.isArray(convexEvents) || convexEvents.length === 0) {
      return localScoutedEvents;
    }
    const convexMapped = convexEvents as unknown as LocalEvent[];
    const existingIds = new Set(convexMapped.map((e) => e.id));
    const uniqueLocal = localScoutedEvents.filter((e) => !existingIds.has(e.id));
    return [...convexMapped, ...uniqueLocal];
  }, [convexEvents, localScoutedEvents]);

  // Recalculate accurate spherical ground distance relative to the active user's location
  const localizedEvents = useMemo(() => {
    const userCoords = location.coordinates;
    const hasValidCoords =
      userCoords &&
      typeof userCoords.lat === 'number' &&
      typeof userCoords.lng === 'number' &&
      !isNaN(userCoords.lat) &&
      !isNaN(userCoords.lng);

    return allEvents.map((event) => {
      if (
        hasValidCoords &&
        event.coordinates &&
        typeof event.coordinates.lat === 'number' &&
        typeof event.coordinates.lng === 'number' &&
        (event.coordinates.lat !== 0 || event.coordinates.lng !== 0)
      ) {
        const distanceKm = calculateHaversineDistanceKm(
          userCoords.lat,
          userCoords.lng,
          event.coordinates.lat,
          event.coordinates.lng
        );
        return { ...event, distanceKm };
      }
      return event;
    });
  }, [allEvents, location.coordinates]);

  // Global Radar Filter: Streams worldwide events with category, score, admission, and search filters
  const filteredEvents = useMemo(() => {
    return localizedEvents
      .filter((event) => {
        // Category Filter
        if (filters.category !== 'all' && event.category !== filters.category) {
          return false;
        }

        // Free Only Filter
        if (filters.onlyFree && !event.isFree) {
          return false;
        }

        // Vibe Match Threshold
        if (event.matchScore < filters.minScore) {
          return false;
        }

        // Keyword Search Filter
        if (searchQuery.trim()) {
          const queryLower = searchQuery.toLowerCase().trim();
          const matchesTitle = event.title.toLowerCase().includes(queryLower);
          const matchesVenue = event.venueName.toLowerCase().includes(queryLower);
          const matchesAddress = event.address.toLowerCase().includes(queryLower);
          const matchesVibes = event.vibeTags.some((vibe) => vibe.toLowerCase().includes(queryLower));
          const matchesDescription = event.description.toLowerCase().includes(queryLower);
          if (!matchesTitle && !matchesVenue && !matchesAddress && !matchesVibes && !matchesDescription) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [localizedEvents, filters, searchQuery]);

  const handleSendAgentMail = (event: LocalEvent) => {
    sendEventInquiry(event);
    updateEventOutreachStatus(event.id, 'sent');
    setSelectedEvent((prev) => (prev && prev.id === event.id ? { ...prev, outreachStatus: 'sent' } : prev));
    setIsDrawerOpen(true);
  };

  const handleSendMessage = (threadId: string, text: string) => {
    replyToThread(threadId, text);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    resetFilters();
  };

  const isLoading = isConfigured && convexEvents === undefined;

  return (
    <div className="bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] font-sans antialiased min-h-screen relative flex flex-col justify-between overflow-x-hidden selection:bg-[var(--theme-text-primary)] selection:text-[var(--theme-bg-surface)]">
      {/* Ambient Leaf Shadow Overlay */}
      <ShadowOverlay />

      {/* Header with Active Radar Tab */}
      <Header
        currentTab="radar"
        onOpenDrawer={() => setIsDrawerOpen(true)}
        unreadCount={unreadCount}
        onOpenFilterDrawer={() => setFilterDrawerOpen(true)}
        locationLabel={location.label}
        coordinates={location.coordinates}
        isLocating={isLocating}
        onLocateMe={locateMe}
        onOpenMapModal={() => setIsMapModalOpen(true)}
        locationError={locationError}
      />

      {/* Main Global Radar Content */}
      <main className="relative z-10 w-full flex-1">
        <RadarHero />

        <RadarFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onOpenTuning={() => setFilterDrawerOpen(true)}
          filteredCount={filteredEvents.length}
        />

        <RadarGrid
          events={filteredEvents}
          isLoading={isLoading}
          onSelectEvent={(event) => setSelectedEvent(event)}
          onResetFilters={handleResetFilters}
        />
      </main>

      {/* Scout Tuning Filter Drawer */}
      <ScoutFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filters={filters}
        onUpdateFilters={updateFilters}
        onResetDefaults={resetFilters}
      />

      {/* AgentMail Outbox Drawer (Right) */}
      <OutboxDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        threads={threads}
        onSendMessage={handleSendMessage}
      />

      {/* Location Pinning Modal */}
      <LocationPinModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        currentLocation={location}
        radiusKm={filters.radiusKm || 20}
        onLocateMe={locateMe}
        onConfirm={(label, coordinates, newRadius) => {
          setCustomLocation(label, coordinates);
          if (newRadius) updateFilters({ radiusKm: newRadius });
        }}
      />

      {/* Event Dossier Modal */}
      <EventDetailModal
        isOpen={Boolean(selectedEvent)}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onSendAgentMail={handleSendAgentMail}
      />
    </div>
  );
}
