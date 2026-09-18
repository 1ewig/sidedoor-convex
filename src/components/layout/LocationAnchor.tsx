'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Loader2,
  Map as MapIcon,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';

interface LocationAnchorProps {
  locationLabel: string;
  isLocating: boolean;
  onLocateMe: () => void;
  onOpenMapModal?: () => void;
  error?: string | null;
}

export function LocationAnchor({
  locationLabel,
  isLocating,
  onLocateMe,
  onOpenMapModal,
  error,
}: LocationAnchorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Close popover on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const isLoading = isLocating || locationLabel === 'Detecting location...';

  return (
    <div ref={containerRef} className="relative inline-block shrink-0">
      {/* Trigger Split-Pill */}
      <div
        className={`inline-flex items-center h-8 sm:h-8.5 rounded-full bg-[var(--theme-bg-surface)]/95 hover:bg-[var(--theme-bg-surface)] border shadow-xs transition-all duration-150 ${isOpen
            ? 'border-[var(--theme-brand-accent)] ring-2 ring-[var(--theme-brand-accent)]/20'
            : 'border-[var(--theme-border-subtle)] hover:border-[var(--theme-border-strong)]'
          }`}
      >
        {/* Main Location Dropdown Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          title={`Current anchor: ${locationLabel}. Click to change.`}
          className="flex items-center gap-1.5 pl-3 pr-2 py-1 text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] hover:text-[var(--theme-brand-accent)] transition-colors cursor-pointer rounded-l-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-accent)] select-none"
        >
          <MapPin className="w-3.5 h-3.5 text-[var(--theme-brand-accent)] shrink-0" />
          <span
            suppressHydrationWarning
            className="max-w-[120px] xs:max-w-[150px] sm:max-w-[190px] truncate font-sans text-left leading-none"
          >
            {locationLabel}
          </span>
          <ChevronDown
            className={`w-3 h-3 text-[var(--theme-text-muted)] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-[var(--theme-brand-accent)]' : ''
              }`}
          />
        </button>

        {/* Clean Inset Divider */}
        <div className="w-px h-3.5 bg-[var(--theme-border-subtle)] shrink-0" aria-hidden="true" />

        {/* Dedicated "Locate Me" Quick GPS Action */}
        <button
          type="button"
          onClick={onLocateMe}
          disabled={isLoading}
          title="Detect my current location (GPS / IP)"
          aria-label="Detect my current location via GPS or IP"
          className="flex items-center justify-center w-8 h-full px-2 text-[var(--theme-text-muted)] hover:text-[var(--theme-brand-accent)] disabled:opacity-40 transition-colors cursor-pointer rounded-r-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-accent)] shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--theme-brand-accent)]" />
          ) : (
            <Navigation className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          aria-label="Scouting Anchor Options"
          className="absolute top-full right-0 sm:right-auto sm:left-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] shadow-2xl z-50 p-3.5 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--theme-border-subtle)]">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--theme-brand-accent)]" />
              <span className="text-[var(--text-xs)] font-semibold text-[var(--theme-text-primary)] font-sans">
                Scouting Base
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[var(--text-2xs)] font-mono uppercase tracking-wider text-[var(--theme-text-muted)] bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)]">
              Anchor
            </span>
          </div>

          {/* Current Active Location Card */}
          <div className="p-2.5 mb-2.5 rounded-xl bg-[var(--theme-bg-base)]/80 border border-[var(--theme-border-subtle)] flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[var(--theme-brand-accent)] shrink-0 animate-pulse" />
            <div className="min-w-0 flex-1">
              <div className="text-[var(--text-2xs)] uppercase font-mono tracking-wider text-[var(--theme-text-muted)]">
                Active Anchor
              </div>
              <p
                suppressHydrationWarning
                className="text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] truncate font-sans mt-0.5"
              >
                {locationLabel}
              </p>
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
              disabled={isLocating}
              className="w-full p-2 rounded-xl bg-[var(--theme-bg-base)] hover:bg-[var(--theme-border-subtle)] text-left flex items-center justify-between gap-2.5 transition duration-150 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-accent)]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] flex items-center justify-center shrink-0 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-brand-accent)] transition-colors">
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

              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--theme-brand-accent)] shrink-0" />
              ) : (
                <span className="text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)] px-1.5 py-0.5 rounded bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] shrink-0">
                  GPS
                </span>
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
                className="w-full p-2 rounded-xl bg-[var(--theme-bg-base)] hover:bg-[var(--theme-border-subtle)] text-left flex items-center justify-between gap-2.5 transition duration-150 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-accent)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] flex items-center justify-center shrink-0 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-brand-accent)] transition-colors">
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
                </div>

                <span className="text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)] px-1.5 py-0.5 rounded bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] shrink-0">
                  Map
                </span>
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
        </div>
      )}
    </div>
  );
}