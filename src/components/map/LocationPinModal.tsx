'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  GeoJSONSource,
  MapMouseEvent,
} from 'maplibre-gl';
// CRITICAL: MapLibre requires its CSS for marker positioning & canvas rendering
import 'maplibre-gl/dist/maplibre-gl.css';
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
  const safeRadius = Math.max(0.1, radiusInKm);
  const latRad = (center[1] * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  // Protect against division by zero near poles
  const safeCosLat = Math.abs(cosLat) < 0.0001 ? 0.0001 : cosLat;

  const distanceX = safeRadius / (111.32 * safeCosLat);
  const distanceY = safeRadius / 110.574;

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
  const isMapLoadedRef = useRef<boolean>(false);

  // Safe initial values
  const defaultLng = Number.isFinite(currentLocation?.coordinates?.lng)
    ? currentLocation.coordinates.lng
    : 74.5313;
  const defaultLat = Number.isFinite(currentLocation?.coordinates?.lat)
    ? currentLocation.coordinates.lat
    : 32.4927;

  const [selectedCoords, setSelectedCoords] = useState<Coordinates>({
    lat: defaultLat,
    lng: defaultLng,
  });
  const [resolvedLabel, setResolvedLabel] = useState<string>(
    currentLocation?.label || 'Selected Location'
  );
  const [currentRadius, setCurrentRadius] = useState<number>(initialRadius || 20);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ label: string; fullAddress: string; coordinates: Coordinates }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize mutable refs so asynchronous events always access fresh values
  const coordsRef = useRef<Coordinates>(selectedCoords);
  const radiusRef = useRef<number>(currentRadius);

  useEffect(() => {
    coordsRef.current = selectedCoords;
  }, [selectedCoords]);

  useEffect(() => {
    radiusRef.current = currentRadius;
  }, [currentRadius]);

  // Update radius GeoJSON layer safely without crashing if map/style is not ready
  const updateRadiusLayer = useCallback((center: Coordinates, radius: number) => {
    const map = mapRef.current;
    if (!map || !isMapLoadedRef.current) return;

    try {
      const source = map.getSource('scout-radius-source') as GeoJSONSource | undefined;
      if (source) {
        source.setData(createGeoJSONCircle([center.lng, center.lat], radius));
      }
    } catch (err) {
      console.warn('Failed to update radius layer:', err);
    }
  }, []);

  // Reverse geocode coordinates to friendly place label
  const reverseGeocode = useCallback(async (coords: Coordinates) => {
    setIsResolvingAddress(true);
    try {
      const res = await fetch(`/api/geocode?lat=${coords.lat}&lng=${coords.lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.label) {
          setResolvedLabel(data.label);
        } else if (data.address) {
          setResolvedLabel(data.address);
        }
      }
    } catch {
      // Keep existing label if fetch fails
    } finally {
      setIsResolvingAddress(false);
    }
  }, []);

  // Initialize MapLibre GL instance ONCE when the modal opens
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Prevent duplicate map instances (e.g. React 18 Strict Mode)
    if (mapRef.current) return;

    const initialCenter: [number, number] = [coordsRef.current.lng, coordsRef.current.lat];

    // OpenFreeMap provides a dark style with no API key requirement
    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: initialCenter,
      zoom: 12,
      attributionControl: false,
    });

    mapRef.current = map;

    // Custom Marker Element with Tailwind styles
    const el = document.createElement('div');
    el.className = 'relative flex items-center justify-center cursor-grab active:cursor-grabbing';
    el.style.width = '34px';
    el.style.height = '34px';
    el.innerHTML = `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: rgba(16, 185, 129, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 26px; height: 26px; border-radius: 9999px; background-color: #059669; border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
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

    // Move radius preview live while dragging
    marker.on('drag', () => {
      const lngLat = marker.getLngLat();
      const newCoords = { lat: lngLat.lat, lng: lngLat.lng };
      coordsRef.current = newCoords;
      updateRadiusLayer(newCoords, radiusRef.current);
    });

    // Handle marker drag completion
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      const newCoords = { lat: lngLat.lat, lng: lngLat.lng };
      setSelectedCoords(newCoords);
      reverseGeocode(newCoords);
      updateRadiusLayer(newCoords, radiusRef.current);
    });

    // Handle clicking anywhere on map canvas to reposition pin
    map.on('click', (e: MapMouseEvent) => {
      const newCoords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      marker.setLngLat([newCoords.lng, newCoords.lat]);
      setSelectedCoords(newCoords);
      reverseGeocode(newCoords);
      updateRadiusLayer(newCoords, radiusRef.current);
    });

    // Add navigation controls (zoom & compass)
    map.addControl(new NavigationControl({ showCompass: true }), 'top-right');

    // Register radius source and vector layers on style load
    map.on('load', () => {
      isMapLoadedRef.current = true;
      map.resize();

      if (!map.getSource('scout-radius-source')) {
        map.addSource('scout-radius-source', {
          type: 'geojson',
          data: createGeoJSONCircle(
            [coordsRef.current.lng, coordsRef.current.lat],
            radiusRef.current
          ),
        });

        // Fill layer
        map.addLayer({
          id: 'scout-radius-fill',
          type: 'fill',
          source: 'scout-radius-source',
          paint: {
            'fill-color': '#10b981',
            'fill-opacity': 0.16,
          },
        });

        // Border stroke line
        map.addLayer({
          id: 'scout-radius-line',
          type: 'line',
          source: 'scout-radius-source',
          paint: {
            'line-color': '#10b981',
            'line-width': 1.8,
            'line-dasharray': [2, 2],
            'line-opacity': 0.85,
          },
        });
      }
    });

    // ResizeObserver prevents gray/clipped tiles when container size settles
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      isMapLoadedRef.current = false;
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, reverseGeocode, updateRadiusLayer]);

  // Handle radius change live
  const handleRadiusChange = (newRadius: number) => {
    setCurrentRadius(newRadius);
    radiusRef.current = newRadius;
    updateRadiusLayer(coordsRef.current, newRadius);
  };

  // Fly to user's real-time GPS location
  const handleFlyToGps = () => {
    setIsLocating(true);
    onLocateMe();

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: Coordinates = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setSelectedCoords(coords);
          coordsRef.current = coords;

          if (mapRef.current) {
            mapRef.current.flyTo({ center: [coords.lng, coords.lat], zoom: 13, speed: 1.4 });
          }
          if (markerRef.current) {
            markerRef.current.setLngLat([coords.lng, coords.lat]);
          }

          updateRadiusLayer(coords, currentRadius);
          reverseGeocode(coords);
          setIsLocating(false);
        },
        (error) => {
          console.warn('Geolocation failed, falling back to currentLocation prop:', error);
          setIsLocating(false);
          // Fallback to prop
          if (mapRef.current && markerRef.current) {
            const coords = currentLocation.coordinates;
            setSelectedCoords(coords);
            coordsRef.current = coords;
            mapRef.current.flyTo({ center: [coords.lng, coords.lat], zoom: 13, speed: 1.4 });
            markerRef.current.setLngLat([coords.lng, coords.lat]);
            updateRadiusLayer(coords, currentRadius);
            setResolvedLabel(currentLocation.label);
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  // Debounced search input handler
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

  // Reposition pin to selected search suggestion
  const handleSelectSearchResult = (item: {
    label: string;
    fullAddress: string;
    coordinates: Coordinates;
  }) => {
    setResolvedLabel(item.label);
    setSelectedCoords(item.coordinates);
    coordsRef.current = item.coordinates;
    setSearchQuery('');
    setSearchResults([]);

    if (mapRef.current && markerRef.current) {
      const center: [number, number] = [item.coordinates.lng, item.coordinates.lat];
      mapRef.current.flyTo({ center, zoom: 13, speed: 1.4 });
      markerRef.current.setLngLat(center);
      updateRadiusLayer(item.coordinates, currentRadius);
    }
  };

  // Confirm and close modal
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

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
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
        <div className="relative flex-1 w-full bg-[#121212] overflow-hidden min-h-[300px]">
          {/* Map Container */}
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

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

            {/* Perimeter Radius Slider */}
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[var(--text-2xs)] font-medium text-[var(--theme-text-muted)] font-sans shrink-0">
                Radius:{' '}
                <strong className="text-[var(--theme-text-primary)] font-mono">
                  {currentRadius} km
                </strong>
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