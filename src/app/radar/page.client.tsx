'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useConvexConfig } from '@/components/providers/ConvexClientProvider';
import { useEventStore } from '@/state/useEventStore';
import { useAgentMail } from '@/hooks/useAgentMail';
import { useUserLocation } from '@/hooks/useUserLocation';
import { ShadowOverlay } from '@/components/layout/ShadowOverlay';
import { Header } from '@/components/layout/Header';
import { RadarHero } from '@/components/radar/RadarHero';
import { RadarFilterBar } from '@/components/radar/RadarFilterBar';
import { RadarGrid } from '@/components/radar/RadarGrid';
import { OutboxDrawer } from '@/components/drawers/OutboxDrawer';
import { LocationPinModal } from '@/components/location/LocationPinModal';
import { EventDetailModal } from '@/components/discovery/EventDetailModal';
import { LocalEvent } from '@/types';
import { RadarCategoryFilter } from '@/components/radar/RadarFilterBar';

export function RadarPageClient() {
  const [activeCategory, setActiveCategory] = useState<RadarCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LocalEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const { isConfigured } = useConvexConfig();
  const localScoutedEvents = useEventStore((state) => state.scoutedEvents);
  const updateEventOutreachStatus = useEventStore((state) => state.updateEventOutreachStatus);

  // Global events query from Convex
  const convexEvents = useQuery(
    api.events.list,
    isConfigured ? { limit: 100 } : 'skip'
  );

  // Recent scout runs for the live autonomous ticker
  const recentRuns = useQuery(
    api.scoutRuns.listRecent,
    isConfigured ? { limit: 6 } : 'skip'
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

  // Merge global Convex events with any local events
  const allEvents = useMemo(() => {
    if (!convexEvents || !Array.isArray(convexEvents) || convexEvents.length === 0) {
      return localScoutedEvents;
    }
    const convexMapped = convexEvents as unknown as LocalEvent[];
    const existingIds = new Set(convexMapped.map((e) => e.id));
    const uniqueLocal = localScoutedEvents.filter((e) => !existingIds.has(e.id));
    return [...convexMapped, ...uniqueLocal];
  }, [convexEvents, localScoutedEvents]);

  // Filter events based on active category, search query, and free-only toggle
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      if (activeCategory !== 'all' && event.category.toLowerCase() !== activeCategory.toLowerCase()) {
        return false;
      }
      if (onlyFree && !event.isFree) {
        return false;
      }
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
    });
  }, [allEvents, activeCategory, onlyFree, searchQuery]);

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
    setActiveCategory('all');
    setSearchQuery('');
    setOnlyFree(false);
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
        locationLabel={location.label}
        coordinates={location.coordinates}
        isLocating={isLocating}
        onLocateMe={locateMe}
        onOpenMapModal={() => setIsMapModalOpen(true)}
        locationError={locationError}
      />

      {/* Main Radar Stream Content */}
      <main className="relative z-10 w-full flex-1">
        <RadarHero
          totalCount={allEvents.length}
          recentRuns={recentRuns}
        />

        <RadarFilterBar
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onlyFree={onlyFree}
          onToggleFree={() => setOnlyFree((prev) => !prev)}
          filteredCount={filteredEvents.length}
        />

        <RadarGrid
          events={filteredEvents}
          isLoading={isLoading}
          onSelectEvent={(event) => setSelectedEvent(event)}
          onResetFilters={handleResetFilters}
        />
      </main>

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
        radiusKm={25}
        onLocateMe={locateMe}
        onConfirm={(label, coordinates) => {
          setCustomLocation(label, coordinates);
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
