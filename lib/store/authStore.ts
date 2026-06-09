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
  selfCareReceiverId: string | null;

  // Actions
  setAuth: (user: User, token: string) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  setActiveRole: (role: AccountType) => Promise<void>;
  setSelfCareReceiverId: (id: string | null) => Promise<void>;
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
  selfCareReceiverId: null,

  setAuth: async (user, token) => {
    const selfId =
      user.caregiverProfile?.selfCareReceiverId ??
      user.careReceiverProfile?.id ??
      null;
    await Promise.all([
      storage.setToken(token),
      storage.setUser(user),
      storage.setSelfCareReceiverId(selfId),
      storage.setBiometricCredentials(token, user),
    ]);
    set({ user, token, isAuthenticated: true, activeRole: user.accountType, selfCareReceiverId: selfId });
  },

  updateUser: async (user) => {
    await storage.setUser(user);
    set({ user });
  },

  setActiveRole: async (role) => {
    await storage.setActiveRole(role);
    set({ activeRole: role });
  },

  setSelfCareReceiverId: async (id) => {
    await storage.setSelfCareReceiverId(id);
    set({ selfCareReceiverId: id });
  },

  syncProfile: async () => {
    const token = await storage.getToken();
    if (!token) return;
    const res = await apiClient.get('/auth/profile');
    const user: User = res.data?.data;
    if (user) {
      const freshSelfId =
        user.caregiverProfile?.selfCareReceiverId ??
        user.careReceiverProfile?.id ??
        null;
      await storage.setUser(user);
      if (freshSelfId) await storage.setSelfCareReceiverId(freshSelfId);
      set({ user, ...(freshSelfId ? { selfCareReceiverId: freshSelfId } : {}) });
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
        // Prefer persisted ID over deriving from user object (user may lack careReceiverProfile after addLinkedProfile)
        const storedSelfId = await storage.getSelfCareReceiverId();
        const selfCareReceiverId = storedSelfId ?? user.careReceiverProfile?.id ?? null;
        // Load from storage immediately so the app feels instant
        set({ user, token, isAuthenticated: true, activeRole, selfCareReceiverId });
        // Then silently fetch the latest from server in the background
        try {
          const res = await apiClient.get('/auth/profile');
          const fresh: User = res.data?.data;
          if (fresh) {
            // caregiverProfile.selfCareReceiverId is the canonical source (set by addLinkedProfile).
            // Fall back to careReceiverProfile.id, then stored value, so no app restart silently clears it.
            const freshSelfId =
              fresh.caregiverProfile?.selfCareReceiverId ??
              fresh.careReceiverProfile?.id ??
              storedSelfId ??
              null;
            await Promise.all([
              storage.setUser(fresh),
              storage.setSelfCareReceiverId(freshSelfId),
            ]);
            set({ user: fresh, selfCareReceiverId: freshSelfId });
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
