import { apiClient } from './client';
import { ApiResponse, CareReceiverProfile, CaregiverInvite } from '../types';

export const careReceiverApi = {
  getProfile: async (): Promise<ApiResponse<CareReceiverProfile>> => {
    const response = await apiClient.get('/care-receiver/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<CareReceiverProfile>): Promise<ApiResponse<CareReceiverProfile>> => {
    const response = await apiClient.patch('/care-receiver/profile', data);
    return response.data;
  },

  searchCaregivers: async (q?: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/care-receiver/caregivers/search', { params: q ? { q } : undefined });
    return response.data;
  },

  getSentInvites: async (): Promise<ApiResponse<CaregiverInvite[]>> => {
    const response = await apiClient.get('/care-receiver/invites');
    return response.data;
  },

  getMyCaregivers: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/care-receiver/my-caregivers');
    return response.data;
  },

  inviteCaregiverByEmail: async (email: string, role?: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post('/care-receiver/invite/email', { email, role });
    return response.data;
  },

  addCaregiver: async (caregiverProfileId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/care-receiver/add-caregiver', { caregiverProfileId });
    return response.data;
  },
};
