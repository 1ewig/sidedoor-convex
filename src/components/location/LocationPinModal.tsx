'use client';

import { X, MapPin, Loader2, Check, Search, Crosshair } from 'lucide-react';
// CRITICAL: MapLibre requires its CSS for marker positioning & canvas rendering
import 'maplibre-gl/dist/maplibre-gl.css';
import { Coordinates } from '@/types';
import { useLocationPinMap } from '@/hooks/useLocationPinMap';

export interface LocationPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: {
    label: string;
    coordinates: Coordinates;
  };
  radiusKm: number;
  onConfirm: (label: string, coordinates: Coordinates, radiusKm: number) => void;
  onLocateMe: () => void;
}

export function LocationPinModal({
  isOpen,
  onClose,
  currentLocation,
  radiusKm: initialRadius,
  onConfirm,
  onLocateMe,
}: LocationPinModalProps) {
  const {
    mapContainerRef,
    selectedCoords,
    resolvedLabel,
    isResolvingAddress,
    isLocating,
    isMapReady,
    searchQuery,
    searchResults,
    isSearching,
    handleFlyToGps,
    handleSearchChange,
    handleSelectSearchResult,
    handleConfirm,
  } = useLocationPinMap({
    isOpen,
    onClose,
    currentLocation,
    initialRadius,
    onConfirm,
    onLocateMe,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[var(--theme-bg-overlay)] backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[85vh] max-h-[750px] flex flex-col rounded-3xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--theme-border-subtle)] bg-[var(--theme-bg-surface)] z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--theme-brand-accent)]/10 text-[var(--theme-brand-accent)] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[var(--text-sm)] font-semibold text-[var(--theme-text-primary)] font-sans flex items-center gap-2">
                Scout Location Pin
                {isResolvingAddress && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--theme-brand-accent)]" />
                )}
              </h2>
              <p className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] font-sans">
                Drag the pin or click anywhere on the map to anchor your scouting base
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Map Modal"
            className="w-8 h-8 rounded-full bg-[var(--theme-bg-base)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Map Canvas with Search Bar Overlay */}
        <div className="relative flex-1 w-full bg-[var(--theme-text-primary)] overflow-hidden min-h-[300px]">
          {/* Map Container */}
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

          {/* Loading Overlay */}
          {!isMapReady && (
            <div className="absolute inset-0 z-15 flex flex-col items-center justify-center bg-[var(--theme-bg-surface)]/80 backdrop-blur-xs transition-opacity duration-300">
              <Loader2 className="w-7 h-7 text-[var(--theme-brand-accent)] animate-spin mb-2" />
              <p className="text-[var(--text-xs)] text-[var(--theme-text-secondary)] font-sans">
                Loading scout map...
              </p>
            </div>
          )}

          {/* Search Flyout on Map */}
          <div className="absolute top-4 left-4 right-4 sm:right-auto sm:w-80 z-20">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search city, area, or address..."
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-[var(--theme-bg-surface)]/95 backdrop-blur-md border border-[var(--theme-border-subtle)] text-[var(--text-xs)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-muted)] shadow-lg focus:outline-none focus:border-[var(--theme-brand-accent)] font-sans"
              />
              <Search className="w-4 h-4 text-[var(--theme-text-muted)] absolute left-3 pointer-events-none" />
              {isSearching && (
                <Loader2 className="w-3.5 h-3.5 text-[var(--theme-brand-accent)] animate-spin absolute right-3 pointer-events-none" />
              )}
            </div>

            {/* Search Suggestions Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-1.5 space-y-1 max-h-48 overflow-y-auto rounded-2xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] shadow-xl p-1.5 backdrop-blur-md">
                {searchResults.map((item) => (
                  <button
                    key={`${item.coordinates.lat}-${item.coordinates.lng}-${item.label}`}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--theme-bg-base)] text-[var(--text-xs)] transition cursor-pointer"
                  >
                    <div className="font-medium text-[var(--theme-text-primary)] truncate font-sans">
                      {item.label}
                    </div>
                    <div className="text-[var(--text-2xs)] text-[var(--theme-text-muted)] truncate font-sans">
                      {item.fullAddress}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recenter / GPS Button */}
          <button
            type="button"
            onClick={handleFlyToGps}
            title="Recenter to my detected location"
            className="absolute bottom-4 right-4 z-20 px-3.5 py-2 rounded-2xl bg-[var(--theme-bg-surface)]/95 backdrop-blur-md border border-[var(--theme-border-subtle)] shadow-lg text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] hover:text-[var(--theme-brand-accent)] flex items-center gap-2 transition cursor-pointer"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 text-[var(--theme-brand-accent)] animate-spin" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-[var(--theme-brand-accent)]" />
            )}
            <span className="hidden sm:inline">Recenter</span>
          </button>
        </div>

        {/* Footer & Controls */}
        <div className="px-5 py-4 bg-[var(--theme-bg-surface)] border-t border-[var(--theme-border-subtle)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 z-10 shrink-0">
          {/* Resolved Place & Coordinates */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-xs)] font-semibold text-[var(--theme-text-primary)] truncate font-sans">
                {resolvedLabel}
              </span>
              <span className="text-[var(--text-2xs)] font-mono text-[var(--theme-text-muted)] px-1.5 py-0.5 rounded-md bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)]">
                {selectedCoords.lat.toFixed(4)}°, {selectedCoords.lng.toFixed(4)}°
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-[var(--text-xs)] font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-base)] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-[var(--theme-text-primary)] hover:opacity-90 text-[var(--theme-bg-surface)] text-[var(--text-xs)] font-semibold flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Confirm Anchor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}