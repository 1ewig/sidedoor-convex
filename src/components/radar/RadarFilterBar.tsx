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
    <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 mb-8 space-y-3">
      {/* Search Input and Tuning Drawer Trigger */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Search Dock */}
        <div className="flex-1 bg-[var(--theme-bg-surface)] rounded-full pl-5 pr-4 py-2 sm:pl-6 sm:pr-4 sm:py-2.5 shadow-[var(--shadow-ambient)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] focus-within:border-[var(--theme-text-primary)]/40 focus-within:shadow-[var(--shadow-float)] transition-all flex items-center gap-2.5 sm:gap-3">
          <Search className="w-4 h-4 text-[var(--theme-text-muted)] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by venue, artist, vibe, or keyword..."
            className="flex-1 bg-transparent text-[var(--text-sm)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none min-w-0 font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] px-2 py-0.5 rounded-full hover:bg-[var(--theme-bg-elevated)] transition-colors cursor-pointer shrink-0"
            >
              Clear
            </button>
          )}
        </div>

        {/* Tuning Trigger Button */}
        <button
          type="button"
          onClick={onOpenTuning}
          className="shrink-0 flex items-center gap-2 px-5 py-2 sm:px-6 sm:py-2.5 rounded-full bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)] hover:bg-[var(--theme-bg-elevated)] text-[var(--text-sm)] font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] shadow-[var(--shadow-ambient)] hover:shadow-[var(--shadow-float)] transition-all cursor-pointer focus-visible:outline-none focus-within:border-[var(--theme-text-primary)]/40 active:scale-95"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
          <span>Tuning</span>
          {isCustomized && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-brand-primary)]" />
          )}
        </button>
      </div>

      {/* Active Filter Indicators & Center-Aligned Result Count */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1 text-center">
        {(filters.category !== 'all' || filters.onlyFree || filters.minScore > 70) && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {filters.category !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] text-[var(--text-2xs)] font-mono text-[var(--theme-text-secondary)] uppercase">
                {filters.category}
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
        )}

        <span className="font-mono text-[var(--text-2xs)] text-[var(--theme-text-muted)]">
          Showing {filteredCount} {filteredCount === 1 ? 'gathering' : 'gatherings'}
        </span>
      </div>
    </div>
  );
}
