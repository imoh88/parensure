import { apiClient } from './client';
import { ApiResponse, Notification } from '../types';

export const notificationApi = {
  getAll: async (): Promise<ApiResponse<Notification[]>> => {
    const response = await apiClient.get('/notification');
    return response.data;
  },

  markRead: async (notificationId: string): Promise<ApiResponse<Notification>> => {
    const response = await apiClient.patch(`/notification/${notificationId}/read`);
    return response.data;
  },

  markAllRead: async (): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.patch('/notification/read-all');
    return response.data;
  },
};
