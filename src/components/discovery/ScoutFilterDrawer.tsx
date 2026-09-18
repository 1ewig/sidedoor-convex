'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  SlidersHorizontal,
  Check,
  RotateCcw,
  MapPin,
  Gauge,
  Tag,
  Ticket,
} from 'lucide-react';
import { SearchFilterState, EventCategory } from '@/types';
import { drawerBackdropVariants, drawerRightVariants } from '@/lib/animations';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

interface ScoutFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilterState;
  onUpdateFilters: (updates: Partial<SearchFilterState>) => void;
  onResetDefaults: () => void;
}

const RADIUS_OPTIONS = [10, 20, 35, 50];
const VIBE_THRESHOLDS = [
  { value: 70, label: '70%', hint: 'Broad' },
  { value: 80, label: '80%', hint: 'Balanced' },
  { value: 90, label: '90%', hint: 'Strict' },
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

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={onChange}
      className={`relative w-10 h-6 shrink-0 rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-base)] ${
        checked ? 'bg-[var(--theme-text-primary)]' : 'bg-[var(--theme-border-strong)]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[var(--theme-bg-surface)] shadow-sm transition-transform duration-200 ease-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[var(--theme-text-muted)] font-sans">
      {children}
    </h4>
  );
}

export function ScoutFilterDrawer({
  isOpen,
  onClose,
  filters,
  onUpdateFilters,
  onResetDefaults,
}: ScoutFilterDrawerProps) {
  useLockBodyScroll(isOpen);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="filter-drawer-backdrop"
            variants={drawerBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            aria-label="Close filter drawer backdrop"
            className="fixed inset-0 bg-[var(--theme-bg-overlay)] backdrop-blur-xs z-40 cursor-default"
          />

          {/* Slide-out Panel (Right) */}
          <motion.aside
            key="filter-drawer-panel"
            variants={drawerRightVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-y-0 right-0 w-full max-w-md sm:max-w-lg bg-[var(--theme-bg-surface)] border-l border-[var(--theme-border-subtle)] shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-[var(--theme-border-subtle)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-full bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] flex items-center justify-center text-[var(--theme-text-primary)]">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-[var(--text-xl)] text-[var(--theme-text-primary)] leading-tight truncate">
                    Scout Tuning
                  </h3>
                  <p className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-sans mt-0.5">
                    Fine-tune crawler &amp; discovery rules
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                className="shrink-0 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] p-2 rounded-lg hover:bg-[var(--theme-bg-base)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Controls */}
            <div className="flex-1 overflow-y-auto p-6 space-y-9">
              {/* Group: Discovery Rules */}
              <div className="space-y-6">
                <GroupLabel>Discovery Rules</GroupLabel>

                {/* Search Radius */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-baseline gap-3">
                    <span className="flex items-center gap-1.5 text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] font-sans">
                      <MapPin className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
                      Search Perimeter
                    </span>
                    <span className="text-[var(--text-2xs)] font-mono text-[var(--theme-text-primary)] font-medium whitespace-nowrap">
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
                          aria-pressed={isSelected}
                          className={`py-1.5 text-[var(--text-2xs)] font-mono rounded-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20 ${
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

                {/* Vibe Sensitivity Threshold */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-baseline gap-3">
                    <span className="flex items-center gap-1.5 text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] font-sans">
                      <Gauge className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
                      Vibe Match Sensitivity
                    </span>
                    <span className="text-[var(--text-2xs)] font-mono text-[var(--theme-text-primary)] font-medium whitespace-nowrap">
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
                          aria-pressed={isSelected}
                          className={`py-1.5 px-1 rounded-lg transition cursor-pointer text-center leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20 ${
                            isSelected
                              ? 'bg-[var(--theme-bg-surface)] text-[var(--theme-text-primary)] shadow-xs'
                              : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]'
                          }`}
                        >
                          <span
                            className={`block text-[var(--text-2xs)] font-sans ${
                              isSelected ? 'font-semibold' : ''
                            }`}
                          >
                            {t.label}
                          </span>
                          <span className="block text-[9px] font-sans opacity-70">{t.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-sans leading-[var(--leading-snug)]">
                    AI filters raw events against your prompt using this minimum confidence score.
                  </p>
                </div>

                {/* Categories */}
                <div className="space-y-2.5">
                  <span className="flex items-center gap-1.5 text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] font-sans">
                    <Tag className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
                    Culture Categories
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((cat) => {
                      const isSelected = filters.category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() =>
                            onUpdateFilters({ category: cat.id as EventCategory | 'all' })
                          }
                          aria-pressed={isSelected}
                          className={`px-3 py-1.5 rounded-full text-[var(--text-2xs)] transition cursor-pointer flex items-center gap-1.5 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20 ${
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
              </div>

              {/* Group: Admission */}
              <div className="space-y-3">
                <GroupLabel>Admission</GroupLabel>

                {/* Admission Filter (Free Only) */}
                <div className="p-4 bg-[var(--theme-bg-base)] rounded-xl border border-[var(--theme-border-subtle)] flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] font-sans">
                      <Ticket className="w-3.5 h-3.5 text-[var(--theme-text-muted)]" />
                      Free &amp; RSVP Only
                    </p>
                    <p className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-sans mt-1 leading-[var(--leading-snug)]">
                      Exclude events requiring advance paid ticketing.
                    </p>
                  </div>
                  <Toggle
                    checked={filters.onlyFree}
                    onChange={() => onUpdateFilters({ onlyFree: !filters.onlyFree })}
                    label="Filter for free events only"
                  />
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-[var(--theme-border-subtle)] bg-[var(--theme-bg-surface)] flex items-center gap-3">
              <button
                type="button"
                onClick={onResetDefaults}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[var(--text-xs)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-base)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--theme-text-primary)] hover:bg-[var(--theme-text-secondary)] text-[var(--theme-bg-surface)] text-[var(--text-xs)] font-medium transition cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--theme-bg-surface)]"
              >
                Apply &amp; Close
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}