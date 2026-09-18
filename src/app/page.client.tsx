'use client';

import { useState } from 'react';
import { useEventDiscovery } from '@/hooks/useEventDiscovery';
import { useAgentMail } from '@/hooks/useAgentMail';
import { ShadowOverlay } from '@/components/layout/ShadowOverlay';
import { Header } from '@/components/layout/Header';
import { FloatingDock } from '@/components/discovery/FloatingDock';
import { DiscoveredFeed } from '@/components/discovery/DiscoveredFeed';
import { CorrespondenceDrawer } from '@/components/agent/CorrespondenceDrawer';
import { LocalEvent } from '@/types';

export function PageClient() {
  const [isFeedOpen, setIsFeedOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
          Continuous local crawling via Firecrawl. Vibe-scored by AI. Organizers contacted autonomously via AgentMail.
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

      {/* Correspondence Drawer */}
      <CorrespondenceDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        threads={threads}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
