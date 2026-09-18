'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, Loader2, Check, Search } from 'lucide-react';
import { Coordinates } from '@/types';

interface LocationAnchorProps {
  locationLabel: string;
  isLocating: boolean;
  onLocateMe: () => void;
  onSelectLocation: (label: string, coords?: Coordinates) => void;
  error?: string | null;
}

const CULTURAL_HUBS: { label: string; coords: Coordinates }[] = [
  { label: 'Lower East Side, NY', coords: { lat: 40.7182, lng: -73.9924 } },
  { label: 'Williamsburg, Brooklyn', coords: { lat: 40.7178, lng: -73.9576 } },
  { label: 'Bushwick, Brooklyn', coords: { lat: 40.7042, lng: -73.9217 } },
  { label: 'East Austin, TX', coords: { lat: 30.2625, lng: -97.7247 } },
  { label: 'Mission District, SF', coords: { lat: 37.7599, lng: -122.4148 } },
  { label: 'Shoreditch, London', coords: { lat: 51.5260, lng: -0.0782 } },
];

export function LocationAnchor({
  locationLabel,
  isLocating,
  onLocateMe,
  onSelectLocation,
  error,
}: LocationAnchorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
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

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onSelectLocation(customInput.trim());
      setCustomInput('');
      setIsOpen(false);
    }
  };

  const handleSelectHub = (hub: { label: string; coords: Coordinates }) => {
    onSelectLocation(hub.label, hub.coords);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Pill */}
      <div className="flex items-center rounded-full bg-[var(--theme-bg-surface)]/90 hover:bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] shadow-xs transition-all">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          title="Change scouting anchor location"
          className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] hover:text-[var(--theme-brand-accent)] transition cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5 text-[var(--theme-brand-accent)] shrink-0" />
          <span className="max-w-[140px] sm:max-w-[190px] truncate font-sans">
            {locationLabel}
          </span>
        </button>

        {/* Dedicated "Locate Me" Quick GPS Action */}
        <button
          type="button"
          onClick={onLocateMe}
          disabled={isLocating}
          title="Detect my current location (GPS)"
          aria-label="Detect my current location via GPS"
          className="pl-1.5 pr-2.5 py-1.5 border-l border-[var(--theme-border-subtle)] text-[var(--theme-text-muted)] hover:text-[var(--theme-brand-accent)] disabled:opacity-50 transition cursor-pointer"
        >
          {isLocating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--theme-brand-accent)]" />
          ) : (
            <Navigation className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] shadow-xl z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 border-b border-[var(--theme-border-subtle)]">
            <span className="text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] font-sans">
              Scouting Anchor
            </span>
            <span className="text-[10px] font-mono text-[var(--theme-text-muted)] uppercase">
              Base Location
            </span>
          </div>

          {/* Quick "Use Current Location" Option */}
          <button
            type="button"
            onClick={() => {
              onLocateMe();
              setIsOpen(false);
            }}
            disabled={isLocating}
            className="w-full mt-3 px-3 py-2 rounded-xl bg-[var(--theme-bg-base)] hover:bg-[var(--theme-border-subtle)] text-[var(--text-xs)] text-[var(--theme-text-primary)] font-medium flex items-center justify-between transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 text-[var(--theme-brand-accent)]" />
              Use Current Location
            </span>
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--theme-brand-accent)]" />
            ) : (
              <span className="text-[10px] font-mono text-[var(--theme-text-muted)]">GPS</span>
            )}
          </button>

          {error && (
            <p className="text-[11px] text-[var(--theme-status-danger)] mt-1.5 px-1 font-sans">
              {error}
            </p>
          )}

          {/* Custom Search Form */}
          <form onSubmit={handleCustomSubmit} className="mt-3">
            <div className="relative flex items-center">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Type city or neighborhood..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)] text-[var(--text-xs)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] focus:outline-none focus:border-[var(--theme-brand-accent)] font-sans"
              />
              <Search className="w-3.5 h-3.5 text-[var(--theme-text-muted)] absolute left-2.5 pointer-events-none" />
            </div>
          </form>

          {/* Cultural Hubs Presets */}
          <div className="mt-3 pt-2.5 border-t border-[var(--theme-border-subtle)]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--theme-text-muted)] font-sans block mb-1.5">
              Popular Cultural Hubs
            </span>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {CULTURAL_HUBS.map((hub) => {
                const isCurrent = locationLabel.toLowerCase() === hub.label.toLowerCase();
                return (
                  <button
                    key={hub.label}
                    type="button"
                    onClick={() => handleSelectHub(hub)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left text-[var(--text-xs)] flex items-center justify-between transition cursor-pointer ${
                      isCurrent
                        ? 'bg-[var(--theme-brand-accent)]/10 text-[var(--theme-brand-accent)] font-medium'
                        : 'hover:bg-[var(--theme-bg-base)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
                    }`}
                  >
                    <span>{hub.label}</span>
                    {isCurrent && <Check className="w-3 h-3 text-[var(--theme-brand-accent)]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
