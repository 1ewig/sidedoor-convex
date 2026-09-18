'use client';

import { useState } from 'react';
import { useEventDiscovery } from '@/hooks/useEventDiscovery';
import { useAgentMail } from '@/hooks/useAgentMail';
import { useUserLocation } from '@/hooks/useUserLocation';
import { ShadowOverlay } from '@/components/layout/ShadowOverlay';
import { Header } from '@/components/layout/Header';
import { FloatingDock } from '@/components/discovery/FloatingDock';
import { DiscoveredFeed } from '@/components/discovery/DiscoveredFeed';
import { OutboxDrawer } from '@/components/agent/OutboxDrawer';
import { ScoutFilterDrawer } from '@/components/discovery/ScoutFilterDrawer';
import { LocationPinModal } from '@/components/location/LocationPinModal';
import { useScoutFilterStore } from '@/state/useScoutFilterStore';
import { LocalEvent } from '@/types';

export function PageClient() {
  const [isFeedOpen, setIsFeedOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const autoInquire = useScoutFilterStore((state) => state.autoInquire);
  const toggleAutoInquire = useScoutFilterStore((state) => state.toggleAutoInquire);
  const resetFilters = useScoutFilterStore((state) => state.resetFilters);

  const {
    events,
    filters,
    updateFilters,
    markEventOutreach,
  } = useEventDiscovery();

  const {
    threads,
    unreadCount,
    sendEventInquiry,
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
    setTimeout(() => {
      const feedElement = document.getElementById('resultsFeed');
      feedElement?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendAgentMail = (event: LocalEvent) => {
    sendEventInquiry(event);
    markEventOutreach(event.id);
    setIsDrawerOpen(true);
  };

  const handleSendMessage = (_threadId: string, text: string) => {
    const activeThread = threads[0];
    if (!activeThread) return;

    activeThread.messages.push({
      id: `msg-${Date.now()}`,
      sender: 'agent',
      senderName: 'You (via SideDoor)',
      senderEmail: 'scout-alpha@sidedoor.agentmail.to',
      subject: activeThread.subject,
      body: text,
      sentAt: 'Just now',
    });
  };

  return (
    <div className="bg-[var(--theme-bg-base)] text-[var(--theme-text-primary)] font-sans antialiased min-h-screen relative flex flex-col justify-between overflow-x-hidden selection:bg-[var(--theme-text-primary)] selection:text-[var(--theme-bg-surface)]">
      {/* Ambient Leaf Shadow Overlay */}
      <ShadowOverlay />

      {/* Header */}
      <Header
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

      {/* Hero & Floating Dock */}
      <main className="relative z-10 w-full max-w-2xl mx-auto px-6 my-auto flex flex-col items-center text-center py-10">
        {/* Editorial Headline */}
        <div className="mb-12 select-none">
          <h1 className="font-serif text-4xl sm:text-5xl text-[var(--theme-text-primary)] tracking-tight leading-[var(--leading-tight)]">
            Local gatherings <br />
            <span className="font-serif italic font-normal text-[var(--theme-text-secondary)]">
              curated in silence
            </span>
          </h1>
        </div>

        {/* Floating Dock */}
        <FloatingDock
          prompt={filters.query}
          onPromptChange={(val) => updateFilters({ query: val })}
          onTriggerDiscovery={handleTriggerDiscovery}
        />

        {/* Soft Descriptive Subtitle */}
        <p className="text-[var(--text-xs)] text-[var(--theme-text-muted)] max-w-sm mt-6 leading-[var(--leading-relaxed)] font-light">
          Finding quiet gatherings, matching your taste, reaching out for you.
        </p>
      </main>

      {/* Expandable Discovered Feed */}
      <div id="resultsFeed">
        <DiscoveredFeed
          events={events}
          isOpen={isFeedOpen}
          onSendAgentMail={handleSendAgentMail}
        />
      </div>

      {/* Scout Tuning Filter Drawer */}
      <ScoutFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={filters}
        onUpdateFilters={updateFilters}
        autoInquire={autoInquire}
        onToggleAutoInquire={toggleAutoInquire}
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
    </div>
  );
}
