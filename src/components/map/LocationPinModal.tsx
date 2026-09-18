'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Map as MapLibreMap, Marker, NavigationControl, GeoJSONSource, MapMouseEvent } from 'maplibre-gl';
import { X, MapPin, Loader2, Check, Search, Crosshair } from 'lucide-react';
import { Coordinates } from '@/types';

interface LocationPinModalProps {
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

// Generate a GeoJSON Polygon approximating a circle given center (lng, lat) and radius in km
function createGeoJSONCircle(center: [number, number], radiusInKm: number, points = 64) {
  const coords: [number, number][] = [];
  const distanceX = radiusInKm / (111.32 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusInKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }
  coords.push(coords[0]); // Close polygon ring

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: {},
  };
}

export function LocationPinModal({
  isOpen,
  onClose,
  currentLocation,
  radiusKm: initialRadius,
  onConfirm,
  onLocateMe,
}: LocationPinModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const radiusRef = useRef<number>(initialRadius);
  const coordsRef = useRef<Coordinates>(currentLocation.coordinates);

  const [selectedCoords, setSelectedCoords] = useState<Coordinates>(currentLocation.coordinates);
  const [resolvedLabel, setResolvedLabel] = useState<string>(currentLocation.label);
  const [currentRadius, setCurrentRadius] = useState<number>(initialRadius);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ label: string; fullAddress: string; coordinates: Coordinates }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync refs when props or state change
  useEffect(() => {
    radiusRef.current = currentRadius;
  }, [currentRadius]);

  useEffect(() => {
    coordsRef.current = selectedCoords;
  }, [selectedCoords]);

  // Reverse geocode coordinates to friendly label
  const reverseGeocode = useCallback(async (coords: Coordinates) => {
    setIsResolvingAddress(true);
    try {
      const res = await fetch(`/api/geocode?lat=${coords.lat}&lng=${coords.lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.label) {
          setResolvedLabel(data.label);
        }
      }
    } catch {
      // Keep existing label
    } finally {
      setIsResolvingAddress(false);
    }
  }, []);

  // Update radius GeoJSON layer
  const updateRadiusLayer = useCallback((center: Coordinates, radius: number) => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('scout-radius-source') as GeoJSONSource | undefined;
    if (source) {
      source.setData(createGeoJSONCircle([center.lng, center.lat], radius));
    }
  }, []);

  // Initialize MapLibre GL
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const initialCenter: [number, number] = [
      currentLocation.coordinates.lng || 74.5313,
      currentLocation.coordinates.lat || 32.4927,
    ];

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: initialCenter,
      zoom: 12,
      attributionControl: false,
    });

    mapRef.current = map;

    // Custom Marker Element
    const el = document.createElement('div');
    el.className = 'relative flex items-center justify-center cursor-grab active:cursor-grabbing';
    el.innerHTML = `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: rgba(16, 185, 129, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 26px; height: 26px; border-radius: 9999px; background-color: #059669; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
          <div style="width: 8px; height: 8px; border-radius: 9999px; background-color: #ffffff;"></div>
        </div>
      </div>
    `;

    const marker = new Marker({
      element: el,
      draggable: true,
    })
      .setLngLat(initialCenter)
      .addTo(map);

    markerRef.current = marker;

    // Handle marker drag
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      const newCoords = { lat: lngLat.lat, lng: lngLat.lng };
      setSelectedCoords(newCoords);
      reverseGeocode(newCoords);
      updateRadiusLayer(newCoords, radiusRef.current);
    });

    // Handle map click to reposition pin
    map.on('click', (e: MapMouseEvent) => {
      const newCoords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      marker.setLngLat([newCoords.lng, newCoords.lat]);
      setSelectedCoords(newCoords);
      reverseGeocode(newCoords);
      updateRadiusLayer(newCoords, radiusRef.current);
    });

    // Add navigation controls (zoom & compass)
    map.addControl(new NavigationControl({ showCompass: true }), 'top-right');

    // Add radius layer once map loads
    map.on('load', () => {
      if (!map.getSource('scout-radius-source')) {
        map.addSource('scout-radius-source', {
          type: 'geojson',
          data: createGeoJSONCircle(initialCenter, initialRadius),
        });

        // Fill layer
        map.addLayer({
          id: 'scout-radius-fill',
          type: 'fill',
          source: 'scout-radius-source',
          paint: {
            'fill-color': '#10b981',
            'fill-opacity': 0.12,
          },
        });

        // Stroke line
        map.addLayer({
          id: 'scout-radius-line',
          type: 'line',
          source: 'scout-radius-source',
          paint: {
            'line-color': '#10b981',
            'line-width': 1.5,
            'line-dasharray': [2, 2],
            'line-opacity': 0.8,
          },
        });
      }
    });

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen, currentLocation.coordinates.lat, currentLocation.coordinates.lng, initialRadius, reverseGeocode, updateRadiusLayer]);

  // Handle radius change
  const handleRadiusChange = (newRadius: number) => {
    setCurrentRadius(newRadius);
    updateRadiusLayer(selectedCoords, newRadius);
  };

  // Fly to user's current GPS location
  const handleFlyToGps = () => {
    onLocateMe();
    if (mapRef.current && markerRef.current) {
      const coords: [number, number] = [currentLocation.coordinates.lng, currentLocation.coordinates.lat];
      mapRef.current.flyTo({ center: coords, zoom: 13, speed: 1.4 });
      markerRef.current.setLngLat(coords);
      setSelectedCoords(currentLocation.coordinates);
      setResolvedLabel(currentLocation.label);
      updateRadiusLayer(currentLocation.coordinates, currentRadius);
    }
  };

  // Search input handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (val.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Fly to search suggestion
  const handleSelectSearchResult = (item: { label: string; fullAddress: string; coordinates: Coordinates }) => {
    setResolvedLabel(item.label);
    setSelectedCoords(item.coordinates);
    setSearchQuery('');
    setSearchResults([]);

    if (mapRef.current && markerRef.current) {
      const center: [number, number] = [item.coordinates.lng, item.coordinates.lat];
      mapRef.current.flyTo({ center, zoom: 13, speed: 1.4 });
      markerRef.current.setLngLat(center);
      updateRadiusLayer(item.coordinates, currentRadius);
    }
  };

  // Confirm and close
  const handleConfirm = () => {
    onConfirm(resolvedLabel, selectedCoords, currentRadius);
    onClose();
  };

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[85vh] max-h-[750px] flex flex-col rounded-3xl bg-[var(--theme-bg-surface)] border border-[var(--theme-border-subtle)] shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--theme-border-subtle)] bg-[var(--theme-bg-surface)] z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--theme-brand-accent)]/10 text-[var(--theme-brand-accent)] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[var(--text-sm)] font-semibold text-[var(--theme-text-primary)] font-sans flex items-center gap-2">
                Scout Location Pin
                {isResolvingAddress && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--theme-brand-accent)]" />}
              </h2>
              <p className="text-[11px] text-[var(--theme-text-muted)] font-sans">
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
        <div className="relative flex-1 w-full bg-[#121212] overflow-hidden">
          {/* Map Container */}
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

          {/* Search Flyout on Map */}
          <div className="absolute top-4 left-4 right-4 sm:right-auto sm:w-84 z-10">
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

            {/* Live Search Suggestions Dropdown */}
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
                    <div className="text-[10px] text-[var(--theme-text-muted)] truncate font-sans">
                      {item.fullAddress}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick "Fly to GPS" Button */}
          <button
            type="button"
            onClick={handleFlyToGps}
            title="Recenter to my detected location"
            className="absolute bottom-4 right-4 z-10 px-3.5 py-2 rounded-2xl bg-[var(--theme-bg-surface)]/95 backdrop-blur-md border border-[var(--theme-border-subtle)] shadow-lg text-[var(--text-xs)] font-medium text-[var(--theme-text-primary)] hover:text-[var(--theme-brand-accent)] flex items-center gap-2 transition cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-[var(--theme-brand-accent)]" />
            <span className="hidden sm:inline">Recenter</span>
          </button>
        </div>

        {/* Footer & Controls */}
        <div className="px-5 py-4 bg-[var(--theme-bg-surface)] border-t border-[var(--theme-border-subtle)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 z-10">
          {/* Resolved Place & Coordinates */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-xs)] font-semibold text-[var(--theme-text-primary)] truncate font-sans">
                {resolvedLabel}
              </span>
              <span className="text-[10px] font-mono text-[var(--theme-text-muted)] px-1.5 py-0.5 rounded-md bg-[var(--theme-bg-base)] border border-[var(--theme-border-subtle)]">
                {selectedCoords.lat.toFixed(4)}°, {selectedCoords.lng.toFixed(4)}°
              </span>
            </div>

            {/* Perimeter Radius Slider */}
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[11px] font-medium text-[var(--theme-text-muted)] font-sans shrink-0">
                Radius: <strong className="text-[var(--theme-text-primary)] font-mono">{currentRadius} km</strong>
              </span>
              <input
                type="range"
                min="2"
                max="100"
                step="1"
                value={currentRadius}
                onChange={(e) => handleRadiusChange(Number(e.target.value))}
                className="w-36 sm:w-48 h-1.5 bg-[var(--theme-border-subtle)] rounded-lg appearance-none cursor-pointer accent-[var(--theme-brand-accent)]"
              />
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
