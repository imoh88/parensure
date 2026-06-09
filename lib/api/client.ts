import axios, { AxiosError, AxiosInstance } from "axios";
import { storage } from "../utils/storage";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Returns a one-off axios config object pre-loaded with the current token and
 * the X-Active-Role header. Use this when a CAREGIVER wants to act as their
 * linked CARE_RECEIVER profile.
 *
 * Usage:
 *   await apiClient.get('/task/mine', await withRole('CARE_RECEIVER'))
 */
export async function withRole(role: 'CARE_RECEIVER' | 'CAREGIVER' | 'FIRM_ADMIN') {
  const token = await storage.getToken();
  return {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Active-Role': role,
    },
  };
}

// Request interceptor to add token and log requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log the request
    console.log("📤 API Request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
    });

    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor for error handling and logging
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log("📥 API Response:", {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  async (error: AxiosError) => {
    // Log errors with full details
    if (error.response) {
      // Server responded with error status
      console.error("❌ API Error Response:", {
        status: error.response.status,
        url: error.config?.url,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      // Request made but no response received
      console.error("❌ API No Response:", {
        url: error.config?.url,
        message: "No response received from server",
        error: error.message,
      });
    } else {
      // Error setting up request
      console.error("❌ API Request Setup Error:", error.message);
    }

    if (error.response?.status === 401) {
      // Token expired, clear storage
      await storage.clearAll();
    }

    return Promise.reject(error);
  },
);
