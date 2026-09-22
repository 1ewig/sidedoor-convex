'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  GeoJSONSource,
  MapMouseEvent,
  StyleSpecification,
} from 'maplibre-gl';
import { Coordinates } from '@/types';
import { createGeoJSONCircle } from '@/lib/geo';
import { reverseGeocodeLocation, searchLocationSuggestions } from '@/lib/location';

// Clean, reliable, unwatermarked OpenStreetMap tiles (100% open-source, no API key required)
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export interface LocationSearchResult {
  label: string;
  fullAddress: string;
  coordinates: Coordinates;
}

export interface UseLocationPinMapOptions {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: {
    label: string;
    coordinates: Coordinates;
  };
  initialRadius: number;
  onConfirm: (label: string, coordinates: Coordinates, radiusKm: number) => void;
  onLocateMe: () => void;
}

export function useLocationPinMap({
  isOpen,
  onClose,
  currentLocation,
  initialRadius,
  onConfirm,
  onLocateMe,
}: UseLocationPinMapOptions) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const isMapLoadedRef = useRef<boolean>(false);

  // Safe initial coordinates
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
  const [isMapReady, setIsMapReady] = useState(false);

  // Live address search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mutable refs to keep async map listeners updated without tearing down map
  const coordsRef = useRef<Coordinates>(selectedCoords);
  const radiusRef = useRef<number>(currentRadius);

  useEffect(() => {
    coordsRef.current = selectedCoords;
  }, [selectedCoords]);

  useEffect(() => {
    radiusRef.current = currentRadius;
  }, [currentRadius]);

  // Update radius GeoJSON vector layer
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

  // Reverse geocode coordinates to human-readable address label
  const reverseGeocode = useCallback(async (coords: Coordinates) => {
    setIsResolvingAddress(true);
    try {
      const resolved = await reverseGeocodeLocation(coords);
      if (resolved?.label) {
        setResolvedLabel(resolved.label);
      }
    } catch {
      // Retain existing label on failure
    } finally {
      setIsResolvingAddress(false);
    }
  }, []);

  // Initialize MapLibre GL map instance
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;
    if (mapRef.current) return;

    setIsMapReady(false);
    const initialCenter: [number, number] = [coordsRef.current.lng, coordsRef.current.lat];

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: OSM_STYLE,
      center: initialCenter,
      zoom: 12,
      attributionControl: false,
    });

    mapRef.current = map;

    // Custom pulse marker DOM node
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

    marker.on('drag', () => {
      const lngLat = marker.getLngLat();
      const newCoords = { lat: lngLat.lat, lng: lngLat.lng };
      coordsRef.current = newCoords;
      updateRadiusLayer(newCoords, radiusRef.current);
    });

    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      const newCoords = { lat: lngLat.lat, lng: lngLat.lng };
      setSelectedCoords(newCoords);
      reverseGeocode(newCoords);
      updateRadiusLayer(newCoords, radiusRef.current);
    });

    map.on('click', (e: MapMouseEvent) => {
      const newCoords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      marker.setLngLat([newCoords.lng, newCoords.lat]);
      setSelectedCoords(newCoords);
      reverseGeocode(newCoords);
      updateRadiusLayer(newCoords, radiusRef.current);
    });

    map.on('error', (e) => {
      console.warn('MapLibre map error:', e);
    });

    map.addControl(new NavigationControl({ showCompass: true }), 'top-right');

    map.on('load', () => {
      isMapLoadedRef.current = true;
      setIsMapReady(true);
      map.resize();

      if (!map.getSource('scout-radius-source')) {
        map.addSource('scout-radius-source', {
          type: 'geojson',
          data: createGeoJSONCircle(
            [coordsRef.current.lng, coordsRef.current.lat],
            radiusRef.current
          ),
        });

        map.addLayer({
          id: 'scout-radius-fill',
          type: 'fill',
          source: 'scout-radius-source',
          paint: {
            'fill-color': '#10b981',
            'fill-opacity': 0.16,
          },
        });

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

    // Handle container animation settling
    const timer1 = setTimeout(() => map.resize(), 150);
    const timer2 = setTimeout(() => map.resize(), 350);

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      resizeObserver.disconnect();
      isMapLoadedRef.current = false;
      setIsMapReady(false);
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

  // Radius adjustment
  const handleRadiusChange = (newRadius: number) => {
    setCurrentRadius(newRadius);
    radiusRef.current = newRadius;
    updateRadiusLayer(coordsRef.current, newRadius);
  };

  // Fly to user GPS position
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
          console.warn('Geolocation fallback triggered:', error);
          setIsLocating(false);
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
        setSearchResults(await searchLocationSuggestions(val));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Select search suggestion
  const handleSelectSearchResult = (item: LocationSearchResult) => {
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

  // Clean debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    mapContainerRef,
    selectedCoords,
    resolvedLabel,
    currentRadius,
    isResolvingAddress,
    isLocating,
    isMapReady,
    searchQuery,
    searchResults,
    isSearching,
    handleRadiusChange,
    handleFlyToGps,
    handleSearchChange,
    handleSelectSearchResult,
    handleConfirm,
  };
}
