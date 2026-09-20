'use client';

import { Radio } from 'lucide-react';
import { Doc } from '@/convex/_generated/dataModel';

interface RadarHeroProps {
  totalCount: number;
  recentRuns?: Doc<'scoutRuns'>[];
}

export function RadarHero({ totalCount, recentRuns = [] }: RadarHeroProps) {
  const latestRun = recentRuns[0];

  return (
    <section className="relative z-10 w-full max-w-4xl mx-auto text-center pt-8 pb-10 px-4 sm:px-6">
      {/* Live Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)] shadow-xs mb-6">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-status-success)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--theme-status-success)]" />
        </span>
        <span className="font-mono text-[var(--text-2xs)] uppercase tracking-wider text-[var(--theme-text-muted)]">
          Live Scout Wire
        </span>
        <span className="text-[var(--theme-border-subtle)]">•</span>
        <span className="font-mono text-[var(--text-2xs)] text-[var(--theme-text-primary)] font-semibold">
          {totalCount} Gatherings Unearthed
        </span>
      </div>

      {/* Editorial Headline */}
      <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[var(--theme-text-primary)] tracking-tight leading-[var(--leading-tight)] mb-4">
        The Public Radar <br />
        <span className="font-serif italic font-normal text-[var(--theme-text-secondary)]">
          worldwide whispers & secret rooms
        </span>
      </h1>

      <p className="text-[var(--text-sm)] text-[var(--theme-text-muted)] max-w-xl mx-auto leading-[var(--leading-relaxed)] font-light mb-8">
        Real-time gatherings curated across cities by autonomous agents. Sourced from indie calendars, DIY spaces, and quiet corners of the web.
      </p>

      {/* Live Autonomous Activity Ticker */}
      {latestRun && (
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[var(--theme-bg-surface)]/80 border border-[var(--theme-border-subtle)] text-[var(--text-xs)] text-[var(--theme-text-secondary)] max-w-md mx-auto shadow-xs backdrop-blur-xs">
          <Radio className="w-3.5 h-3.5 text-[var(--theme-text-primary)] shrink-0 animate-pulse" />
          <div className="truncate text-left">
            <span className="font-medium text-[var(--theme-text-primary)]">
              {latestRun.location || 'Global scout'}
            </span>
            <span className="text-[var(--theme-text-muted)]"> · &ldquo;{latestRun.prompt}&rdquo;</span>
          </div>
          <span className="shrink-0 font-mono text-[var(--text-2xs)] px-1.5 py-0.5 rounded-full bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)]">
            +{latestRun.totalEventsFound} found
          </span>
        </div>
      )}
    </section>
  );
}
