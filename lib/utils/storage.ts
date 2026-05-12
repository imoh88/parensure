import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: '@auth_token',
  REFRESH_TOKEN: '@refresh_token',
  USER: '@user',
  BIOMETRIC_TOKEN: '@biometric_token',
  BIOMETRIC_USER: '@biometric_user',
  ACTIVE_ROLE: '@active_role',
};

export const storage = {
  // Token operations
  getToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(KEYS.TOKEN);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  setToken: async (token: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(KEYS.TOKEN, token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  },

  removeToken: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(KEYS.TOKEN);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },

  // Refresh token operations
  getRefreshToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  },

  setRefreshToken: async (token: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(KEYS.REFRESH_TOKEN, token);
    } catch (error) {
      console.error('Error setting refresh token:', error);
    }
  },

  removeRefreshToken: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error removing refresh token:', error);
    }
  },

  // User operations
  getUser: async (): Promise<any | null> => {
    try {
      const userJson = await AsyncStorage.getItem(KEYS.USER);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  setUser: async (user: any): Promise<void> => {
    try {
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error setting user:', error);
    }
  },

  removeUser: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(KEYS.USER);
    } catch (error) {
      console.error('Error removing user:', error);
    }
  },

  // Biometric credentials — persists through regular logout
  getBiometricCredentials: async (): Promise<{ token: string; user: any } | null> => {
    try {
      const [token, userJson] = await Promise.all([
        AsyncStorage.getItem(KEYS.BIOMETRIC_TOKEN),
        AsyncStorage.getItem(KEYS.BIOMETRIC_USER),
      ]);
      if (!token || !userJson) return null;
      return { token, user: JSON.parse(userJson) };
    } catch {
      return null;
    }
  },

  setBiometricCredentials: async (token: string, user: any): Promise<void> => {
    try {
      await Promise.all([
        AsyncStorage.setItem(KEYS.BIOMETRIC_TOKEN, token),
        AsyncStorage.setItem(KEYS.BIOMETRIC_USER, JSON.stringify(user)),
      ]);
    } catch (error) {
      console.error('Error saving biometric credentials:', error);
    }
  },

  clearBiometricCredentials: async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([KEYS.BIOMETRIC_TOKEN, KEYS.BIOMETRIC_USER]);
    } catch (error) {
      console.error('Error clearing biometric credentials:', error);
    }
  },

  getActiveRole: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(KEYS.ACTIVE_ROLE);
    } catch {
      return null;
    }
  },

  setActiveRole: async (role: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(KEYS.ACTIVE_ROLE, role);
    } catch (error) {
      console.error('Error setting active role:', error);
    }
  },

  // Clear all (session only — biometric credentials are kept)
  clearAll: async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.REFRESH_TOKEN, KEYS.USER, KEYS.ACTIVE_ROLE]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
