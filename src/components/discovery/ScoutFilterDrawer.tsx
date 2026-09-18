import { X, SlidersHorizontal, Check, RotateCcw } from 'lucide-react';
import { SearchFilterState, EventCategory } from '@/types';

interface ScoutFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilterState;
  onUpdateFilters: (updates: Partial<SearchFilterState>) => void;
  autoInquire: boolean;
  onToggleAutoInquire: () => void;
  onResetDefaults: () => void;
}

const RADIUS_OPTIONS = [10, 20, 35, 50];
const VIBE_THRESHOLDS = [
  { value: 70, label: '70% (Broad)' },
  { value: 80, label: '80% (Balanced)' },
  { value: 90, label: '90% (Strict)' },
];

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All Gatherings' },
  { id: 'music', label: 'Music & Shows' },
  { id: 'art', label: 'Art & Openings' },
  { id: 'market', label: 'Markets & Fleas' },
  { id: 'nightlife', label: 'Nightlife' },
  { id: 'food', label: 'Food & Wine' },
  { id: 'community', label: 'Community' },
];

export function ScoutFilterDrawer({
  isOpen,
  onClose,
  filters,
  onUpdateFilters,
  autoInquire,
  onToggleAutoInquire,
  onResetDefaults,
}: ScoutFilterDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close filter drawer backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-[var(--theme-bg-overlay)] backdrop-blur-xs z-40 cursor-default"
      />

      {/* Slide-out Panel (Left) */}
      <aside className="fixed inset-y-0 left-0 w-full max-w-sm bg-[var(--theme-bg-surface)] border-r border-[var(--theme-border-subtle)] shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="p-6 border-b border-[var(--theme-border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[var(--theme-bg-base)] flex items-center justify-center text-[var(--theme-text-primary)]">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-serif text-[var(--text-xl)] text-[var(--theme-text-primary)]">
                Scout Tuning
              </h3>
              <p className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-sans">
                Fine-tune crawler & discovery rules
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] text-[var(--text-sm)] p-1.5 rounded-lg hover:bg-[var(--theme-bg-base)] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Controls */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Search Radius */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] font-sans">
                Search Perimeter
              </span>
              <span className="text-[var(--text-2xs)] font-mono text-[var(--theme-brand-accent)]">
                {filters.radiusKm} km radius
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-[var(--theme-bg-base)] rounded-xl border border-[var(--theme-border-subtle)]">
              {RADIUS_OPTIONS.map((km) => {
                const isSelected = filters.radiusKm === km;
                return (
                  <button
                    key={km}
                    type="button"
                    onClick={() => onUpdateFilters({ radiusKm: km })}
                    className={`py-1.5 text-[var(--text-2xs)] font-mono rounded-lg transition cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--theme-bg-surface)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
                        : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]'
                    }`}
                  >
                    {km} km
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Vibe Sensitivity Threshold */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] font-sans">
                Vibe Match Sensitivity
              </span>
              <span className="text-[var(--text-2xs)] font-mono text-[var(--theme-brand-accent)]">
                min {filters.minScore}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--theme-bg-base)] rounded-xl border border-[var(--theme-border-subtle)]">
              {VIBE_THRESHOLDS.map((t) => {
                const isSelected = filters.minScore === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => onUpdateFilters({ minScore: t.value })}
                    className={`py-1.5 px-1 text-[var(--text-2xs)] font-sans rounded-lg transition cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[var(--theme-bg-surface)] text-[var(--theme-text-primary)] shadow-xs font-semibold'
                        : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-sans leading-[var(--leading-snug)]">
              AI filters raw events against your prompt using this minimum confidence score.
            </p>
          </div>

          {/* Section 3: Categories */}
          <div className="space-y-2.5">
            <span className="text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] font-sans block">
              Culture Categories
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const isSelected = filters.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onUpdateFilters({ category: cat.id as EventCategory | 'all' })}
                    className={`px-3 py-1.5 rounded-full text-[var(--text-2xs)] transition cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] border-[var(--theme-text-primary)] font-medium'
                        : 'bg-[var(--theme-bg-base)] text-[var(--theme-text-secondary)] border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Admission Filter (Free Only) */}
          <div className="p-3.5 bg-[var(--theme-bg-base)] rounded-xl border border-[var(--theme-border-subtle)] flex items-center justify-between">
            <div>
              <p className="text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] font-sans">
                Free & RSVP Only
              </p>
              <p className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-sans mt-0.5">
                Exclude events requiring advance paid ticketing
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Filter for free events only"
              aria-checked={filters.onlyFree}
              onClick={() => onUpdateFilters({ onlyFree: !filters.onlyFree })}
              className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                filters.onlyFree
                  ? 'bg-[var(--theme-brand-accent)] justify-end'
                  : 'bg-[var(--theme-border-strong)] justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-[var(--theme-bg-surface)] shadow-xs transition-transform" />
            </button>
          </div>

          {/* Section 5: AgentMail Autonomous Outreach */}
          <div className="p-3.5 bg-[var(--theme-bg-base)] rounded-xl border border-[var(--theme-border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] font-sans">
                  AgentMail Auto-Inquire
                </p>
                <p className="text-[var(--text-2xs)] text-[var(--theme-brand-accent)] font-mono mt-0.5">
                  scout-alpha@sidedoor.agentmail.to
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Toggle AgentMail autonomous inquiry"
                aria-checked={autoInquire}
                onClick={onToggleAutoInquire}
                className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                  autoInquire
                    ? 'bg-[var(--theme-brand-accent)] justify-end'
                    : 'bg-[var(--theme-border-strong)] justify-start'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-[var(--theme-bg-surface)] shadow-xs transition-transform" />
              </button>
            </div>
            <p className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-sans leading-[var(--leading-snug)] pt-1 border-t border-[var(--theme-border-subtle)]">
              Automatically dispatches polite inquiries to venue booking agents when door tickets, set times, or RSVP links are unlisted.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-[var(--theme-border-subtle)] bg-[var(--theme-bg-surface)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[var(--text-xs)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-base)] transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-xl bg-[var(--theme-text-primary)] text-[var(--theme-bg-surface)] text-[var(--text-xs)] font-medium hover:opacity-90 transition cursor-pointer text-center"
          >
            Apply & Close
          </button>
        </div>
      </aside>
    </>
  );
}
