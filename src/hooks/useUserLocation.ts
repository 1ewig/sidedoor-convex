'use client';

import { useEffect, useCallback } from 'react';
import { useLocationStore } from '@/state/useLocationStore';
import { Coordinates } from '@/types';

export function useUserLocation() {
  const location = useLocationStore((state) => state.location);
  const isLocating = useLocationStore((state) => state.isLocating);
  const error = useLocationStore((state) => state.error);
  const locateMe = useLocationStore((state) => state.locateMe);
  const setLocation = useLocationStore((state) => state.setLocation);
  const searchLocations = useLocationStore((state) => state.searchLocations);
  const initAutoDetection = useLocationStore((state) => state.initAutoDetection);

  useEffect(() => {
    initAutoDetection();
  }, [initAutoDetection]);

  const setCustomLocation = useCallback(
    (label: string, coordinates?: Coordinates) => {
      setLocation(
        {
          label,
          coordinates: coordinates || { lat: 32.4927, lng: 74.5313 },
        },
        true
      );
    },
    [setLocation]
  );

  return {
    location,
    isLocating,
    error,
    locateMe,
    setCustomLocation,
    searchLocations,
  };
}
