import { create } from 'zustand';
import { Alert } from '../types';

const STALE_MS = 5 * 60 * 1000; // 5 minutes

interface AlertsState {
  alerts: Alert[];
  lastFetchedAt: number | null;

  setAlerts: (alerts: Alert[]) => void;
  upsertAlert: (alert: Alert) => void;
  invalidate: () => void;
  isStale: () => boolean;
  clearAlerts: () => void;
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  lastFetchedAt: null,

  setAlerts: (alerts) => set({ alerts, lastFetchedAt: Date.now() }),

  upsertAlert: (alert) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === alert.id ? alert : a)),
    })),

  invalidate: () => set({ lastFetchedAt: null }),

  isStale: () => {
    const { lastFetchedAt } = get();
    if (lastFetchedAt === null) return true;
    return Date.now() - lastFetchedAt > STALE_MS;
  },

  clearAlerts: () => set({ alerts: [], lastFetchedAt: null }),
}));
