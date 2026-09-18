'use client';

import { useState, useCallback } from 'react';
import { UserLocation, Coordinates } from '@/types';

const DEFAULT_LOCATION: UserLocation = {
  label: 'Lower East Side, NY',
  coordinates: { lat: 40.7182, lng: -73.9924 },
};

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locateMe = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const coords: Coordinates = { lat, lng };

        let resolvedLabel = `${lat.toFixed(2)}°N, ${Math.abs(lng).toFixed(2)}°W`;

        try {
          // Attempt reverse geocoding for a human-readable city/neighborhood
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`,
            {
              headers: { 'Accept-Language': 'en' },
              signal: controller.signal,
            }
          );
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const address = data.address || {};
            const neighborhood =
              address.neighbourhood ||
              address.suburb ||
              address.quarter ||
              address.city_district;
            const city =
              address.city ||
              address.town ||
              address.municipality ||
              address.village ||
              address.state;

            if (neighborhood && city) {
              resolvedLabel = `${neighborhood}, ${city}`;
            } else if (city) {
              resolvedLabel = city;
            } else if (data.name) {
              resolvedLabel = data.name;
            }
          }
        } catch {
          // Fallback to coordinate string if geocoding fails or times out
        }

        setLocation({
          label: resolvedLabel,
          coordinates: coords,
        });
        setIsLocating(false);
      },
      (geoError) => {
        setIsLocating(false);
        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            setError('Location permission denied.');
            break;
          case geoError.POSITION_UNAVAILABLE:
            setError('Position unavailable.');
            break;
          case geoError.TIMEOUT:
            setError('Location request timed out.');
            break;
          default:
            setError('Unable to retrieve location.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const setCustomLocation = useCallback((label: string, coordinates?: Coordinates) => {
    setLocation((prev) => ({
      label,
      coordinates: coordinates || prev.coordinates,
    }));
    setError(null);
  }, []);

  return {
    location,
    isLocating,
    error,
    locateMe,
    setCustomLocation,
  };
}
