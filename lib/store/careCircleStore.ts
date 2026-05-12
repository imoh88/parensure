import { create } from 'zustand';

const STALE_MS = 5 * 60 * 1000; // 5 minutes

interface CareCircleState {
  invites: any[];
  lastFetchedAt: number | null;

  setInvites: (invites: any[]) => void;
  clearCareCircle: () => void;
  isStale: () => boolean;
}

export const useCareCircleStore = create<CareCircleState>((set, get) => ({
  invites: [],
  lastFetchedAt: null,

  setInvites: (invites) => set({ invites, lastFetchedAt: Date.now() }),

  clearCareCircle: () => set({ invites: [], lastFetchedAt: null }),

  isStale: () => {
    const { lastFetchedAt } = get();
    if (lastFetchedAt === null) return true;
    return Date.now() - lastFetchedAt > STALE_MS;
  },
}));
