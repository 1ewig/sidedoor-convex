'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Navigation,
  Loader2,
  Map as MapIcon,
  ChevronDown,
  AlertCircle,
  Crosshair,
} from 'lucide-react';
import { Coordinates } from '@/types';
import { useLocationStore } from '@/state/useLocationStore';
import { popoverVariants } from '@/lib/animations';

export interface LocationAnchorProps {
  locationLabel: string;
  coordinates?: Coordinates;
  isLocating: boolean;
  onLocateMe: () => void;
  onOpenMapModal?: () => void;
  error?: string | null;
}

export function LocationAnchor({
  locationLabel,
  coordinates,
  isLocating,
  onLocateMe,
  onOpenMapModal,
  error,
}: LocationAnchorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  const storeCoordinates = useLocationStore((state) => state.location.coordinates);
  const activeCoordinates = coordinates || storeCoordinates;

  // Close popover on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close popover on Escape key and return focus to trigger button
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerButtonRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const isLoading = isLocating || locationLabel === 'Detecting location...';

  return (
    <div ref={containerRef} className="relative inline-block shrink-0">
      {/* Location Anchor Trigger Pill */}
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="location-anchor-popover"
        title={`Current anchor: ${locationLabel}.${error ? ` Note: ${error}.` : ''} Click to change.`}
        className={`group inline-flex items-center gap-1.5 h-8 sm:h-8.5 px-3 rounded-full bg-[var(--theme-bg-surface)]/80 hover:bg-[var(--theme-bg-surface)] text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-all duration-150 border shadow-xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-98 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20 ${
          error
            ? 'border-[var(--theme-status-danger)]/60 ring-2 ring-[var(--theme-status-danger)]/15'
            : isOpen
              ? 'border-[var(--theme-text-primary)] ring-2 ring-[var(--theme-text-primary)]/10 text-[var(--theme-text-primary)]'
              : 'border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)]'
        }`}
      >
        <MapPin
          className={`w-3.5 h-3.5 shrink-0 transition-colors duration-150 ${
            isOpen
              ? 'text-[var(--theme-text-primary)]'
              : 'text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text-primary)]'
          }`}
        />
        <span
          suppressHydrationWarning
          className="max-w-[140px] xs:max-w-[180px] sm:max-w-[220px] truncate font-sans text-left leading-none"
        >
          {locationLabel}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text-primary)] transition-all duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[var(--theme-text-primary)]' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown with Framer Motion Animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="location-anchor-popover"
            key="location-anchor-popover"
            variants={popoverVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-label="Scouting Anchor Options"
            className="absolute top-full right-0 sm:right-auto sm:left-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] shadow-2xl z-50 p-3.5 origin-top"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--theme-border-subtle)]">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--theme-text-primary)]" />
                <span className="text-[var(--text-xs)] font-semibold text-[var(--theme-text-primary)] font-sans">
                  Scouting Base
                </span>
              </div>
            </div>

            {/* Current Active Location Card (Icon + Location & Coordinates) */}
            <div className="p-2.5 mb-2.5 rounded-xl bg-[var(--theme-bg-base)]/90 border border-[var(--theme-border-subtle)] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] flex items-center justify-center shrink-0 text-[var(--theme-text-muted)]">
                <Crosshair className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p
                  suppressHydrationWarning
                  className="text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] font-sans leading-snug break-words"
                >
                  {locationLabel}
                </p>
                {activeCoordinates && (
                  <div className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-mono truncate">
                    {activeCoordinates.lat.toFixed(4)}°, {activeCoordinates.lng.toFixed(4)}°
                  </div>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-1.5">
              {/* Quick "Use Current Location" Option */}
              <button
                type="button"
                onClick={() => {
                  onLocateMe();
                  setIsOpen(false);
                }}
                disabled={isLoading}
                className="w-full p-2 rounded-xl bg-[var(--theme-bg-base)] hover:bg-[var(--theme-border-subtle)] text-left flex items-center justify-between gap-2.5 transition duration-150 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] flex items-center justify-center shrink-0 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text-primary)] transition-colors">
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] font-sans">
                      Use Current Location
                    </div>
                    <div className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-sans truncate">
                      Detect via GPS or IP
                    </div>
                  </div>
                </div>

                {isLocating && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--theme-text-primary)] shrink-0" />
                )}
              </button>

              {/* "Pin on Interactive Map" Option */}
              {onOpenMapModal && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenMapModal();
                    setIsOpen(false);
                  }}
                  className="w-full p-2 rounded-xl bg-[var(--theme-bg-base)] hover:bg-[var(--theme-border-subtle)] text-left flex items-center gap-2.5 transition duration-150 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-text-primary)]/20"
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] flex items-center justify-center shrink-0 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text-primary)] transition-colors">
                    <MapIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] font-sans">
                      Pin on Interactive Map
                    </div>
                    <div className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-sans truncate">
                      Drag pin & adjust radius
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="mt-2.5 p-2 rounded-xl bg-[var(--theme-status-danger)]/10 border border-[var(--theme-status-danger)]/20 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-[var(--theme-status-danger)] shrink-0 mt-0.5" />
                <p className="text-[var(--text-2xs)] text-[var(--theme-status-danger)] font-sans leading-tight">
                  {error}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}