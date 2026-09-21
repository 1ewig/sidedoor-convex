'use client';

import { useState } from 'react';
import { useEventDiscovery } from '@/hooks/useEventDiscovery';
import { useAgentMail } from '@/hooks/useAgentMail';
import { useUserLocation } from '@/hooks/useUserLocation';
import { ShadowOverlay } from '@/components/layout/ShadowOverlay';
import { Header } from '@/components/layout/Header';
import { FloatingDock } from '@/components/discovery/FloatingDock';
import { DiscoveredFeed } from '@/components/discovery/DiscoveredFeed';
import { OutboxDrawer } from '@/components/drawers/OutboxDrawer';
import { ScoutFilterDrawer } from '@/components/drawers/ScoutFilterDrawer';
import { LocationPinModal } from '@/components/location/LocationPinModal';
import { EventDetailModal } from '@/components/discovery/EventDetailModal';
import { useScoutFilterStore } from '@/state/useScoutFilterStore';
import { LocalEvent } from '@/types';

export function PageClient() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LocalEvent | null>(null);

  const resetFilters = useScoutFilterStore((state) => state.resetFilters);

  const {
    events,
    filters,
    isScouting,
    hybridStats,
    isFeedOpen,
    setIsFeedOpen,
    updateFilters,
    markEventOutreach,
    triggerScout,
    dismissBatch,
  } = useEventDiscovery();

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

  const handleResetDefaults = () => {
    resetFilters();
  };

  const handleTriggerDiscovery = () => {
    setIsFeedOpen(true);
    triggerScout(filters.query);
    setTimeout(() => {
      const feedElement = document.getElementById('resultsFeed');
      feedElement?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendAgentMail = (event: LocalEvent) => {
    sendEventInquiry(event);
    markEventOutreach(event.id);
    setSelectedEvent((prev) => (prev && prev.id === event.id ? { ...prev, outreachStatus: 'sent' } : prev));
    setIsDrawerOpen(true);
  };

  const handleSendMessage = (threadId: string, text: string) => {
    replyToThread(threadId, text);
  };

  const isFeedVisible = isFeedOpen || events.length > 0 || isScouting;

  return (
    <div className="bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] font-sans antialiased min-h-screen relative flex flex-col justify-between overflow-x-hidden selection:bg-[var(--theme-text-primary)] selection:text-[var(--theme-bg-surface)]">
      {/* Ambient Leaf Shadow Overlay */}
      <ShadowOverlay />

      {/* Header */}
      <Header
        currentTab="studio"
        onOpenDrawer={() => setIsDrawerOpen(true)}
        unreadCount={unreadCount}
        onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
        locationLabel={location.label}
        coordinates={location.coordinates}
        isLocating={isLocating}
        onLocateMe={locateMe}
        onOpenMapModal={() => setIsMapModalOpen(true)}
        locationError={locationError}
      />

      {/* Main Global Studio Content */}
      <main
        className={`relative z-10 w-full flex-1 flex flex-col transition-all duration-500 ${
          !isFeedVisible ? 'justify-center pb-20' : 'justify-start'
        }`}
      >
        {/* Studio Hero */}
        <section
          className={`relative z-10 w-full max-w-4xl mx-auto text-center px-4 sm:px-6 transition-all duration-500 ${
            !isFeedVisible ? 'py-12' : 'pt-8 pb-8'
          }`}
        >
          {/* Editorial Headline */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[var(--theme-text-primary)] tracking-tight leading-[var(--leading-tight)] mb-4">
            Local gatherings <br />
            <span className="font-serif italic font-normal text-[var(--theme-text-secondary)]">
              curated in silence
            </span>
          </h1>

          {/* Soft Descriptive Subtitle */}
          <p className="text-[var(--text-sm)] text-[var(--theme-text-muted)] max-w-xl mx-auto leading-[var(--leading-relaxed)] font-light mb-8">
            Finding quiet gatherings, matching your taste, reaching out for you.
          </p>

          {/* Floating Dock */}
          <FloatingDock
            prompt={filters.query}
            isScouting={isScouting}
            onPromptChange={(val) => updateFilters({ query: val })}
            onTriggerDiscovery={handleTriggerDiscovery}
          />
        </section>

        {/* Expandable Discovered Feed */}
        <div id="resultsFeed">
          <DiscoveredFeed
            events={events}
            isOpen={isFeedVisible}
            isScouting={isScouting}
            hybridStats={hybridStats}
            onSelectEvent={(event) => setSelectedEvent(event)}
            onDismissBatch={dismissBatch}
          />
        </div>
      </main>

      {/* Scout Tuning Filter Drawer */}
      <ScoutFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={filters}
        onUpdateFilters={updateFilters}
        onResetDefaults={handleResetDefaults}
      />

      {/* AgentMail Outbox Drawer (Right) */}
      <OutboxDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        threads={threads}
        onSendMessage={handleSendMessage}
      />

      {/* Interactive MapLibre GL Location Pinning Modal */}
      <LocationPinModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        currentLocation={location}
        radiusKm={filters.radiusKm}
        onLocateMe={locateMe}
        onConfirm={(label, coordinates) => {
          setCustomLocation(label, coordinates);
        }}
      />

      {/* Focused Event Dossier Modal */}
      <EventDetailModal
        isOpen={Boolean(selectedEvent)}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onSendAgentMail={handleSendAgentMail}
      />
    </div>
  );
}
