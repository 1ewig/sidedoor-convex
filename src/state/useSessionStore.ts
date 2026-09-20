import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SessionState {
  sessionId: string;
  setSessionId: (id: string) => void;
  resetSessionId: () => string;
}

export function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `sess_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }
  return `sess_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: generateSessionId(),
      setSessionId: (id: string) => set({ sessionId: id }),
      resetSessionId: () => {
        const newId = generateSessionId();
        set({ sessionId: newId });
        return newId;
      },
    }),
    {
      name: 'sidedoor_anonymous_session',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
