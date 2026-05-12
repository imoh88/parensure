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
