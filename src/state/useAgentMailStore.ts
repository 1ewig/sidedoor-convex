import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { EmailThread } from '@/types';

interface AgentMailStoreState {
  localThreads: EmailThread[];
  selectedThreadId: string | null;
  setLocalThreads: (threads: EmailThread[] | ((prev: EmailThread[]) => EmailThread[])) => void;
  setSelectedThreadId: (id: string | null) => void;
  clearThreads: () => void;
}

export const useAgentMailStore = create<AgentMailStoreState>()(
  persist(
    (set) => ({
      localThreads: [],
      selectedThreadId: null,

      setLocalThreads: (updater) => {
        set((state) => ({
          localThreads: typeof updater === 'function' ? updater(state.localThreads) : updater,
        }));
      },

      setSelectedThreadId: (selectedThreadId) => set({ selectedThreadId }),

      clearThreads: () => set({ localThreads: [], selectedThreadId: null }),
    }),
    {
      name: 'sidedoor_agent_mail_threads',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
