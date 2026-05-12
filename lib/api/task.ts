import { apiClient } from './client';
import { ApiResponse } from '../types';

export const taskApi = {
  complete: async (taskId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/tasks/${taskId}/status`, { status: 'COMPLETED' });
    return response.data;
  },
};
