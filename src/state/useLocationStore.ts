import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserLocation, Coordinates } from '@/types';
import {
  locateByIp,
  reverseGeocodeLocation,
  searchLocationSuggestions,
} from '@/lib/location';

export const DEFAULT_FALLBACK_LABEL = 'Detecting location...';

export const DEFAULT_COORDINATES: Coordinates = {
  lat: 32.4927,
  lng: 74.5313,
};

export const DEFAULT_LOCATION: UserLocation = {
  label: DEFAULT_FALLBACK_LABEL,
  coordinates: DEFAULT_COORDINATES,
};

interface LocationState {
  location: UserLocation;
  isLocating: boolean;
  error: string | null;
  isPinModalOpen: boolean;
  isUserExplicit: boolean;

  // Actions
  setLocation: (location: UserLocation, isExplicit?: boolean) => void;
  setIsLocating: (isLocating: boolean) => void;
  setError: (error: string | null) => void;
  setPinModalOpen: (open: boolean) => void;
  locateMe: () => Promise<void>;
  searchLocations: (query: string) => Promise<
    Array<{
      label: string;
      fullAddress: string;
      coordinates: Coordinates;
    }>
  >;
  initAutoDetection: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      location: DEFAULT_LOCATION,
      isLocating: false,
      error: null,
      isPinModalOpen: false,
      isUserExplicit: false,

      setLocation: (location, isExplicit = true) => {
        set({
          location,
          isUserExplicit: isExplicit,
          error: null,
        });
      },

      setIsLocating: (isLocating) => set({ isLocating }),

      setError: (error) => set({ error }),

      setPinModalOpen: (isPinModalOpen) => set({ isPinModalOpen }),

      searchLocations: async (query: string) => {
        if (!query || query.trim().length < 2) return [];
        return searchLocationSuggestions(query);
      },

      locateMe: async () => {
        set({ isLocating: true, error: null });

        let gpsSucceeded = false;

        // 1. Try Browser Geolocation
        if (typeof window !== 'undefined' && navigator.geolocation) {
          try {
            const coords = await new Promise<Coordinates>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => reject(err),
                {
                  enableHighAccuracy: false,
                  timeout: 4000,
                  maximumAge: 60000,
                }
              );
            });

            const resolved = await reverseGeocodeLocation(coords);
            set({
              location: {
                label: resolved?.label || `${coords.lat.toFixed(3)}°N, ${coords.lng.toFixed(3)}°E`,
                coordinates: coords,
                countryCode: resolved?.countryCode,
              },
              isUserExplicit: true,
              isLocating: false,
              error: null,
            });
            return;
          } catch {
            // Browser GPS denied or unavailable
          }
        }

        // 2. Server-side IP Geolocation fallback
        if (!gpsSucceeded) {
          try {
            const resolved = await locateByIp();
            if (resolved) {
              set({
                location: resolved,
                isUserExplicit: true,
                isLocating: false,
                error: null,
              });
              return;
            }
            set({
              error: 'Could not detect location. Please select or search your city.',
              isLocating: false,
            });
          } catch {
            set({
              error: 'Could not detect location. Please select or search your city.',
              isLocating: false,
            });
          }
        }
      },

      initAutoDetection: () => {
        const { isUserExplicit, location } = get();
        // If the user already set an explicit location, do not override
        if (isUserExplicit && location.label !== DEFAULT_FALLBACK_LABEL) {
          return;
        }

        // Auto-detect silently in the background
        locateByIp()
          .then((resolved) => {
            if (resolved) {
              const current = get();
              if (!current.isUserExplicit) {
                set({
                  location: resolved,
                  error: null,
                });
              }
            }
          })
          .catch(() => {
            // Silent fallback
          });
      },
    }),
    {
      name: 'sidedoor_user_location',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        location: state.location,
        isUserExplicit: state.isUserExplicit,
      }),
    }
  )
);
