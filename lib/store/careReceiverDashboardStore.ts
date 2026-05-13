import { create } from 'zustand';

const STALE_MS = 5 * 60 * 1000; // 5 minutes

interface CareReceiverDashboardState {
  tasks: any[];
  appointments: any[];
  hasCareTeam: boolean;
  lastFetchedAt: number | null;

  setData: (tasks: any[], appointments: any[], hasCareTeam: boolean) => void;
  clearDashboard: () => void;
  isStale: () => boolean;
}

export const useCareReceiverDashboardStore = create<CareReceiverDashboardState>((set, get) => ({
  tasks: [],
  appointments: [],
  hasCareTeam: false,
  lastFetchedAt: null,

  setData: (tasks, appointments, hasCareTeam) =>
    set({ tasks, appointments, hasCareTeam, lastFetchedAt: Date.now() }),

  clearDashboard: () =>
    set({ tasks: [], appointments: [], hasCareTeam: false, lastFetchedAt: null }),

  isStale: () => {
    const { lastFetchedAt } = get();
    if (lastFetchedAt === null) return true;
    return Date.now() - lastFetchedAt > STALE_MS;
  },
}));
