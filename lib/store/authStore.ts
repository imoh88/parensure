import { create } from 'zustand';
import { AccountType, User } from '../types';
import { storage } from '../utils/storage';
import { apiClient } from '../api/client';
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: AccountType | null;

  // Actions
  setAuth: (user: User, token: string) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  setActiveRole: (role: AccountType) => Promise<void>;
  syncProfile: () => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  activeRole: null,

  setAuth: async (user, token) => {
    await Promise.all([
      storage.setToken(token),
      storage.setUser(user),
      storage.setBiometricCredentials(token, user),
    ]);
    set({ user, token, isAuthenticated: true, activeRole: user.accountType });
  },

  updateUser: async (user) => {
    await storage.setUser(user);
    set({ user });
  },

  setActiveRole: async (role) => {
    await storage.setActiveRole(role);
    set({ activeRole: role });
  },

  syncProfile: async () => {
    try {
      const token = await storage.getToken();
      if (!token) return;
      const res = await apiClient.get('/auth/profile');
      const user: User = res.data?.data;
      if (user) {
        await storage.setUser(user);
        set({ user });
      }
    } catch {
      // silently ignore — stale data is better than crashing
    }
  },

  logout: async () => {
    await storage.clearAll();
    set({ user: null, token: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const token = await storage.getToken();
      const user = await storage.getUser();

      if (token && user) {
        const savedRole = await storage.getActiveRole();
        const activeRole = (savedRole as AccountType | null) ?? user.accountType;
        // Load from storage immediately so the app feels instant
        set({ user, token, isAuthenticated: true, activeRole });
        // Then silently fetch the latest from server in the background
        try {
          const res = await apiClient.get('/auth/profile');
          const fresh: User = res.data?.data;
          if (fresh) {
            await storage.setUser(fresh);
            set({ user: fresh });
          }
        } catch {
          // network unavailable — cached user is fine
        }
      }
    } catch (error) {
      console.error('Error restoring session:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));
