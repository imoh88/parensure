import { create } from 'zustand';

const STALE_MS = 5 * 60 * 1000; // 5 minutes

interface TeamCache {
  members: any[];
  lastFetchedAt: number;
}

interface CaregiverDashboardState {
  bookings: any[];
  lastFetchedAt: number | null;
  teamCache: Record<string, TeamCache>;

  setBookings: (bookings: any[]) => void;
  setTeam: (careReceiverId: string, members: any[]) => void;
  getTeam: (careReceiverId: string) => any[];
  invalidateTeam: (careReceiverId: string) => void;
  isStale: () => boolean;
  isTeamStale: (careReceiverId: string) => boolean;
  clearDashboard: () => void;
}

export const useCaregiverDashboardStore = create<CaregiverDashboardState>((set, get) => ({
  bookings: [],
  lastFetchedAt: null,
  teamCache: {},

  setBookings: (bookings) => set({ bookings, lastFetchedAt: Date.now() }),

  setTeam: (careReceiverId, members) =>
    set((state) => ({
      teamCache: {
        ...state.teamCache,
        [careReceiverId]: { members, lastFetchedAt: Date.now() },
      },
    })),

  getTeam: (careReceiverId) => get().teamCache[careReceiverId]?.members ?? [],

  invalidateTeam: (careReceiverId) =>
    set((state) => {
      const updated = { ...state.teamCache };
      delete updated[careReceiverId];
      return { teamCache: updated };
    }),

  isStale: () => {
    const { lastFetchedAt } = get();
    if (lastFetchedAt === null) return true;
    return Date.now() - lastFetchedAt > STALE_MS;
  },

  isTeamStale: (careReceiverId) => {
    const entry = get().teamCache[careReceiverId];
    if (!entry) return true;
    return Date.now() - entry.lastFetchedAt > STALE_MS;
  },

  clearDashboard: () => set({ bookings: [], lastFetchedAt: null, teamCache: {} }),
}));
