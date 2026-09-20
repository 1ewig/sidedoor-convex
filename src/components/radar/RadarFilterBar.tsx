'use client';

import { Search, Sparkles } from 'lucide-react';
import { EventCategory } from '@/types';

export type RadarCategoryFilter = EventCategory | 'all';

interface RadarFilterBarProps {
  activeCategory: RadarCategoryFilter;
  onSelectCategory: (category: RadarCategoryFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onlyFree: boolean;
  onToggleFree: () => void;
  filteredCount: number;
}

const CATEGORIES: { id: RadarCategoryFilter; label: string }[] = [
  { id: 'all', label: 'All Gatherings' },
  { id: 'music', label: 'Indie & Live Music' },
  { id: 'art', label: 'Galleries & Art' },
  { id: 'nightlife', label: 'Underground & DJ' },
  { id: 'market', label: 'Vintage & Fleas' },
  { id: 'food', label: 'Pop-ups & Culinary' },
  { id: 'community', label: 'DIY & Spaces' },
];

export function RadarFilterBar({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onlyFree,
  onToggleFree,
  filteredCount,
}: RadarFilterBarProps) {
  return (
    <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 mb-8 space-y-4">
      {/* Search Input and Free Toggle */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by venue, artist, city, or vibe tags (e.g. ambient, vinyl, rooftop)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] focus:border-[var(--theme-border-strong)] text-[var(--text-xs)] text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-muted)] shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20 transition-all"
          />
        </div>

        <button
          type="button"
          onClick={onToggleFree}
          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-[var(--text-xs)] font-medium border transition-all cursor-pointer ${
            onlyFree
              ? 'bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] border-[var(--theme-text-primary)] shadow-xs'
              : 'bg-[var(--theme-bg-surface)] text-[var(--theme-text-secondary)] border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Free Only</span>
        </button>
      </div>

      {/* Category Horizontal Filter Pills */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[var(--text-xs)] font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] font-semibold shadow-xs'
                    : 'bg-[var(--theme-bg-surface)]/80 text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] border border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <span className="font-mono text-[var(--text-2xs)] text-[var(--theme-text-muted)] shrink-0">
          Showing {filteredCount} {filteredCount === 1 ? 'gathering' : 'gatherings'}
        </span>
      </div>
    </div>
  );
}
