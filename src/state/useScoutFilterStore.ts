import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SearchFilterState, EventCategory, ScoutEngineMode, ScoutTimeFilter } from '@/types';

export const DEFAULT_SEARCH_FILTERS: SearchFilterState = {
  query: '',
  radiusKm: 20,
  category: 'all',
  onlyFree: false,
  minScore: 70,
  scoutMode: 'fast',
  when: 'this weekend',
};

interface ScoutFilterState {
  filters: SearchFilterState;
  isFilterDrawerOpen: boolean;

  // Actions
  updateFilters: (partial: Partial<SearchFilterState>) => void;
  setQuery: (query: string) => void;
  setRadius: (radiusKm: number) => void;
  setCategory: (category: EventCategory | 'all') => void;
  setOnlyFree: (onlyFree: boolean) => void;
  setMinScore: (minScore: number) => void;
  setScoutMode: (scoutMode: ScoutEngineMode) => void;
  setTimeFilter: (when: ScoutTimeFilter) => void;
  setFilterDrawerOpen: (isOpen: boolean) => void;
  resetFilters: () => void;
}

export const useScoutFilterStore = create<ScoutFilterState>()(
  persist(
    (set) => ({
      filters: DEFAULT_SEARCH_FILTERS,
      isFilterDrawerOpen: false,

      updateFilters: (partial) => {
        set((state) => ({
          filters: { ...state.filters, ...partial },
        }));
      },

      setQuery: (query) => {
        set((state) => ({
          filters: { ...state.filters, query },
        }));
      },

      setRadius: (radiusKm) => {
        set((state) => ({
          filters: { ...state.filters, radiusKm },
        }));
      },

      setCategory: (category) => {
        set((state) => ({
          filters: { ...state.filters, category },
        }));
      },

      setOnlyFree: (onlyFree) => {
        set((state) => ({
          filters: { ...state.filters, onlyFree },
        }));
      },

      setMinScore: (minScore) => {
        set((state) => ({
          filters: { ...state.filters, minScore },
        }));
      },

      setScoutMode: (scoutMode) => {
        set((state) => ({
          filters: { ...state.filters, scoutMode },
        }));
      },

      setTimeFilter: (when) => {
        set((state) => ({
          filters: { ...state.filters, when },
        }));
      },

      setFilterDrawerOpen: (isFilterDrawerOpen) => set({ isFilterDrawerOpen }),

      resetFilters: () => {
        set((state) => ({
          filters: {
            ...DEFAULT_SEARCH_FILTERS,
            query: state.filters.query,
            scoutMode: state.filters.scoutMode,
          },
        }));
      },
    }),
    {
      name: 'sidedoor_scout_preferences',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filters: state.filters,
      }),
    }
  )
);
