'use client';

import { useState, useCallback, useEffect } from 'react';
import { UserLocation, Coordinates } from '@/types';

const STORAGE_KEY = 'sidedoor_user_location';
const DEFAULT_FALLBACK_LABEL = 'Detecting location...';

interface StoredLocation extends UserLocation {
  isUserExplicit?: boolean;
}

const DEFAULT_LOCATION: UserLocation = {
  label: DEFAULT_FALLBACK_LABEL,
  coordinates: { lat: 32.4927, lng: 74.5313 },
};

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);

  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper: Fetch server-side IP geolocation (First-party, immune to client ad-blockers)
  const fetchFromApiLocate = useCallback(async (): Promise<UserLocation | null> => {
    try {
      const res = await fetch('/api/locate', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.label && data.coordinates) {
          return {
            label: data.label,
            coordinates: data.coordinates,
          };
        }
      }
    } catch {
      // API call failed, fallback handled in caller
    }
    return null;
  }, []);

  // Main Locate Me: Queries GPS first, then automatically resolves via server-side /api/locate
  const locateMe = useCallback(async () => {
    setIsLocating(true);
    setError(null);

    let gpsSucceeded = false;

    // 1. Try Browser Geolocation
    if (typeof window !== 'undefined' && navigator.geolocation) {
      try {
        const coords = await new Promise<Coordinates>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => reject(err),
            {
              enableHighAccuracy: false, // Prevent hanging on desktop PCs without GPS chips
              timeout: 4000,
              maximumAge: 60000,
            }
          );
        });

        // If GPS returned coordinates, reverse-geocode via /api/geocode
        try {
          const res = await fetch(`/api/geocode?lat=${coords.lat}&lng=${coords.lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data.label) {
              const newLoc: UserLocation = {
                label: data.label,
                coordinates: coords,
              };
              setLocation(newLoc);
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...newLoc, isUserExplicit: true }));
              } catch {}
              gpsSucceeded = true;
              setIsLocating(false);
              return;
            }
          }
        } catch {
          // Geocode failed, fall through
        }
      } catch {
        // Browser GPS denied or unavailable
      }
    }

    // 2. Server-side IP Geolocation fallback (works immediately on any device/network)
    if (!gpsSucceeded) {
      const detected = await fetchFromApiLocate();
      if (detected) {
        setLocation(detected);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...detected, isUserExplicit: true }));
        } catch {}
        setError(null);
      } else {
        setError('Could not detect location. Please select or search your city.');
      }
    }

    setIsLocating(false);
  }, [fetchFromApiLocate]);

  // Set custom user selection (with coordinates)
  const setCustomLocation = useCallback((label: string, coordinates?: Coordinates) => {
    const updated: UserLocation = {
      label,
      coordinates: coordinates || { lat: 32.4927, lng: 74.5313 },
    };
    setLocation(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...updated, isUserExplicit: true }));
    } catch {}
    setError(null);
  }, []);

  // Search locations helper for autocomplete
  const searchLocations = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) return [];
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        return (data.results || []) as Array<{
          label: string;
          fullAddress: string;
          coordinates: Coordinates;
        }>;
      }
    } catch {
      // Search failed
    }
    return [];
  }, []);

  // Auto-detect on initial load if no explicit user location was previously saved
  useEffect(() => {
    let shouldAutoDetect = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: StoredLocation = JSON.parse(saved);
        if (
          parsed?.label &&
          parsed?.coordinates &&
          parsed.label !== DEFAULT_FALLBACK_LABEL &&
          parsed.label !== 'Lower East Side, NY'
        ) {
          queueMicrotask(() => {
            setLocation(parsed);
          });
          if (parsed.isUserExplicit) {
            shouldAutoDetect = false;
          }
        }
      }
    } catch {}

    if (shouldAutoDetect) {
      fetchFromApiLocate().then((detected) => {
        if (detected) {
          setLocation(detected);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(detected));
          } catch {}
        }
      });
    }
  }, [fetchFromApiLocate]);

  return {
    location,
    isLocating,
    error,
    locateMe,
    setCustomLocation,
    searchLocations,
  };
}
