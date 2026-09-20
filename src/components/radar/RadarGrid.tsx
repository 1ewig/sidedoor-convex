'use client';

import Link from 'next/link';
import { Compass, RotateCcw } from 'lucide-react';
import { LocalEvent } from '@/types';
import { EventCard } from '@/components/discovery/EventCard';

interface RadarGridProps {
  events: LocalEvent[];
  isLoading: boolean;
  onSelectEvent: (event: LocalEvent) => void;
  onResetFilters: () => void;
}

export function RadarGrid({
  events,
  isLoading,
  onSelectEvent,
  onResetFilters,
}: RadarGridProps) {
  if (isLoading) {
    return (
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="relative z-10 w-full max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] flex items-center justify-center mx-auto mb-4 text-[var(--theme-text-muted)]">
          <Compass className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-[var(--text-lg)] text-[var(--theme-text-primary)] mb-2">
          No gatherings match this radar angle
        </h3>
        <p className="text-[var(--text-xs)] text-[var(--theme-text-muted)] max-w-sm mx-auto mb-6 leading-[var(--leading-relaxed)]">
          Try clearing your search query or category filter, or dispatch an autonomous agent from the Studio to scout your city.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
          <Link
            href="/main"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] hover:opacity-90 text-[var(--text-xs)] font-medium transition-all shadow-xs"
          >
            <span>Launch New Scout ↗</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 pb-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onSelect={onSelectEvent}
          />
        ))}
      </div>
    </section>
  );
}
