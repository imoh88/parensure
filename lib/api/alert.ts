import { apiClient } from './client';
import { Alert, AlertStatus, ApiResponse } from '../types';

export const alertApi = {
  getAll: async (status?: AlertStatus): Promise<ApiResponse<Alert[]>> => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/alert', { params });
    return response.data;
  },

  checkIn: async (alertId: string): Promise<ApiResponse<Alert>> => {
    const response = await apiClient.patch(`/alert/${alertId}/check-in`);
    return response.data;
  },

  resolve: async (alertId: string): Promise<ApiResponse<Alert>> => {
    const response = await apiClient.patch(`/alert/${alertId}/resolve`);
    return response.data;
  },

  triggerSos: async (): Promise<ApiResponse<Alert>> => {
    const response = await apiClient.post('/care-receiver/sos');
    return response.data;
  },
};
