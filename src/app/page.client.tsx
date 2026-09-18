'use client';

import { useState } from 'react';
import { useEventDiscovery } from '@/hooks/useEventDiscovery';
import { useAgentMail } from '@/hooks/useAgentMail';
import { Navbar, ViewMode } from '@/components/layout/Navbar';
import { SearchHeader } from '@/components/discovery/SearchHeader';
import { EventCard } from '@/components/discovery/EventCard';
import { EventDetailDrawer } from '@/components/discovery/EventDetailDrawer';
import { InteractiveMap } from '@/components/map/InteractiveMap';
import { AgentDrawer } from '@/components/agent/AgentDrawer';
import { AgentMailModal } from '@/components/agent/AgentMailModal';
import { LocalEvent } from '@/types';

export function PageClient() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  // Discovery & crawler hook
  const {
    events,
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
  } = useEventDiscovery();

  // AgentMail communications hook
  const {
    threads,
    selectedThread,
    setSelectedThreadId,
    isMailModalOpen,
    setIsMailModalOpen,
    isSending,
    unreadCount,
    sendEventInquiry,
  } = useAgentMail();

  const handleAskOrganizer = (event: LocalEvent) => {
    setSelectedEventId(event.id);
    sendEventInquiry(event);
    markEventOutreach(event.id);
  };

  const handleSendMessage = (_threadId: string, text: string) => {
    if (!selectedThread) return;
    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'agent' as const,
      senderName: 'You (via SideDoor)',
      senderEmail: 'scout-alpha@sidedoor.agentmail.to',
      subject: selectedThread.subject,
      body: text,
      sentAt: 'Just now',
    };
    selectedThread.messages.push(userMsg);
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-[#1c1917] flex flex-col font-sans">
      {/* Top Publication Masthead */}
      <Navbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        unreadMailCount={unreadCount}
        onOpenMail={() => setIsMailModalOpen(true)}
        onOpenAgentLogs={() => setIsDrawerOpen(true)}
        isScouting={isScouting}
      />

      {/* Discovery Intent Bar */}
      <SearchHeader
        filters={filters}
        onFilterChange={updateFilters}
        onTriggerScout={triggerScout}
        isScouting={isScouting}
        totalFound={events.length}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Split View */}
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Cartographic Map */}
            <div className="lg:col-span-6 lg:sticky lg:top-24 h-[520px] lg:h-[calc(100vh-180px)]">
              <InteractiveMap
                events={events}
                selectedEventId={selectedEventId}
                onSelectEvent={(evt) => setSelectedEventId(evt.id)}
                radiusKm={filters.radiusKm}
                onAskOrganizer={handleAskOrganizer}
              />
            </div>

            {/* Right Column: Editorial Events Feed */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-baseline justify-between pb-3 border-b border-stone-200">
                <h2 className="font-serif text-lg text-stone-900 font-medium">
                  Curated Local Index <span className="text-stone-400 font-sans text-xs">({events.length})</span>
                </h2>
                <span className="text-xs text-stone-400 font-mono">
                  Ranked by Vibe Resonance
                </span>
              </div>

              {events.length === 0 ? (
                <div className="p-12 text-center rounded-xl border border-stone-200 bg-white text-stone-500">
                  <p className="text-sm font-serif">No gatherings found within the selected perimeter.</p>
                  <button
                    onClick={() => updateFilters({ radiusKm: 30, category: 'all', onlyFree: false })}
                    className="mt-3 text-xs text-stone-900 underline font-medium cursor-pointer"
                  >
                    Expand search radius
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isSelected={selectedEventId === event.id}
                      onSelect={(evt) => setSelectedEventId(evt.id)}
                      onAskOrganizer={handleAskOrganizer}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Map Only View */}
        {viewMode === 'map' && (
          <div className="h-[calc(100vh-200px)]">
            <InteractiveMap
              events={events}
              selectedEventId={selectedEventId}
              onSelectEvent={(evt) => setSelectedEventId(evt.id)}
              radiusKm={filters.radiusKm}
              onAskOrganizer={handleAskOrganizer}
            />
          </div>
        )}

        {/* Feed Only View */}
        {viewMode === 'feed' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-baseline justify-between pb-3 border-b border-stone-200">
              <h2 className="font-serif text-xl text-stone-900 font-medium">
                Curated Local Index <span className="text-stone-400 font-sans text-xs">({events.length})</span>
              </h2>
              <span className="text-xs text-stone-400 font-mono">
                Ranked by Vibe Resonance
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isSelected={selectedEventId === event.id}
                  onSelect={(evt) => setSelectedEventId(evt.id)}
                  onAskOrganizer={handleAskOrganizer}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Event Reading Dossier Drawer */}
      <EventDetailDrawer
        event={selectedEvent}
        isOpen={Boolean(selectedEventId && !isMailModalOpen)}
        onClose={() => setSelectedEventId(null)}
        onSendInquiry={handleAskOrganizer}
        isSending={isSending}
      />

      {/* Scout Field Notes Drawer */}
      <AgentDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        logs={logs}
        isScouting={isScouting}
        onTriggerScout={() => triggerScout()}
      />

      {/* AgentMail Correspondence Modal */}
      <AgentMailModal
        isOpen={isMailModalOpen}
        onClose={() => setIsMailModalOpen(false)}
        threads={threads}
        selectedThread={selectedThread}
        onSelectThread={setSelectedThreadId}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
