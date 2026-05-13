import { ApiResponse } from '../types';
import { apiClient } from './client';

// LovedOne model was removed. This file is kept for import compatibility.
export const lovedOnesApi = {
  getAll: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/loved-ones');
    return response.data;
  },

  create: async (data: {
    name: string;
    dateOfBirth?: string;
    medicalNotes?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/loved-ones', data);
    return response.data;
  },

  getOne: async (lovedOneId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/loved-ones/${lovedOneId}`);
    return response.data;
  },

  getDashboard: async (lovedOneId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/loved-ones/${lovedOneId}/dashboard`);
    return response.data;
  },
};
