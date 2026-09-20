'use client';

import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { SearchFilterState } from '@/types';

interface RadarFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: SearchFilterState;
  onOpenTuning: () => void;
  filteredCount: number;
}

export function RadarFilterBar({
  searchQuery,
  onSearchChange,
  filters,
  onOpenTuning,
  filteredCount,
}: RadarFilterBarProps) {
  const isCustomized =
    filters.category !== 'all' ||
    filters.onlyFree ||
    filters.minScore !== 80 ||
    filters.radiusKm !== 20;

  return (
    <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 mb-8 space-y-3">
      {/* Search Input and Tuning Drawer Trigger */}
      <div className="flex items-center gap-3">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by venue, artist, vibe tags, or keyword..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] focus:border-[var(--theme-border-strong)] text-[var(--text-xs)] text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-muted)] shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20 transition-all"
          />
        </div>

        <button
          type="button"
          onClick={onOpenTuning}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-bg-elevated)] text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
          <span>Tuning</span>
          {isCustomized && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-brand-primary)]" />
          )}
        </button>
      </div>

      {/* Active Filter Indicators & Result Count */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1 text-[var(--text-xs)]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.category !== 'all' && (
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] text-[var(--text-2xs)] font-mono text-[var(--theme-text-secondary)] uppercase">
              {filters.category}
            </span>
          )}
          {filters.radiusKm && (
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)]">
              ≤{filters.radiusKm} km
            </span>
          )}
          {filters.onlyFree && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] text-[var(--text-2xs)] font-mono text-[var(--theme-text-secondary)]">
              <Sparkles className="w-2.5 h-2.5" />
              Free only
            </span>
          )}
          {filters.minScore > 70 && (
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)]">
              {filters.minScore}%+ match
            </span>
          )}
        </div>

        <span className="font-mono text-[var(--text-2xs)] text-[var(--theme-text-muted)] shrink-0 ml-auto">
          Showing {filteredCount} {filteredCount === 1 ? 'gathering' : 'gatherings'}
        </span>
      </div>
    </div>
  );
}
