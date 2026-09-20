import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { LocalEvent, ScoutLog, HybridDiscoveryStats } from '@/types';

interface EventStoreState {
  scoutedEvents: LocalEvent[];
  hybridStats: HybridDiscoveryStats | null;
  logs: ScoutLog[];
  selectedEventId: string | null;
  isFeedOpen: boolean;

  // Actions
  setScoutedEvents: (events: LocalEvent[] | ((prev: LocalEvent[]) => LocalEvent[])) => void;
  appendScoutedEvents: (freshEvents: LocalEvent[]) => void;
  updateEventOutreachStatus: (eventId: string, status: 'none' | 'sent' | 'replied') => void;
  setHybridStats: (stats: HybridDiscoveryStats | null) => void;
  setLogs: (logs: ScoutLog[] | ((prev: ScoutLog[]) => ScoutLog[])) => void;
  appendLog: (log: ScoutLog) => void;
  setSelectedEventId: (id: string | null) => void;
  setIsFeedOpen: (isOpen: boolean) => void;
  clearEvents: () => void;
}

export const useEventStore = create<EventStoreState>()(
  persist(
    (set) => ({
      scoutedEvents: [],
      hybridStats: null,
      logs: [],
      selectedEventId: null,
      isFeedOpen: false,

      setScoutedEvents: (updater) => {
        set((state) => ({
          scoutedEvents: typeof updater === 'function' ? updater(state.scoutedEvents) : updater,
        }));
      },

      appendScoutedEvents: (freshEvents) => {
        set((state) => {
          const existingIds = new Set(state.scoutedEvents.map((e) => e.id));
          const uniqueNew = freshEvents.filter((e) => !existingIds.has(e.id));
          return {
            scoutedEvents: [...uniqueNew, ...state.scoutedEvents],
            isFeedOpen: true,
          };
        });
      },

      updateEventOutreachStatus: (eventId, status) => {
        set((state) => ({
          scoutedEvents: state.scoutedEvents.map((e) =>
            e.id === eventId ? { ...e, outreachStatus: status } : e
          ),
        }));
      },

      setHybridStats: (hybridStats) => set({ hybridStats }),

      setLogs: (updater) => {
        set((state) => ({
          logs: typeof updater === 'function' ? updater(state.logs) : updater,
        }));
      },

      appendLog: (log) => {
        set((state) => ({
          logs: [log, ...state.logs],
        }));
      },

      setSelectedEventId: (selectedEventId) => set({ selectedEventId }),

      setIsFeedOpen: (isFeedOpen) => set({ isFeedOpen }),

      clearEvents: () =>
        set({
          scoutedEvents: [],
          hybridStats: null,
          logs: [],
          selectedEventId: null,
          isFeedOpen: false,
        }),
    }),
    {
      name: 'sidedoor_scouted_events',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        scoutedEvents: state.scoutedEvents,
        hybridStats: state.hybridStats,
        logs: state.logs.slice(0, 20),
        selectedEventId: state.selectedEventId,
        isFeedOpen: state.isFeedOpen,
      }),
    }
  )
);
