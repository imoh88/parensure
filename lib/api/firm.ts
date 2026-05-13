import { apiClient } from './client';
import { ApiResponse, FirmProfile, FirmInvite } from '../types';

export const firmApi = {
  getProfile: async (): Promise<ApiResponse<FirmProfile>> => {
    const response = await apiClient.get('/firm/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<FirmProfile>): Promise<ApiResponse<FirmProfile>> => {
    const response = await apiClient.patch('/firm/profile', data);
    return response.data;
  },

  listCaregivers: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/firm/caregivers');
    return response.data;
  },

  inviteExistingCaregiver: async (caregiverId: string): Promise<ApiResponse<FirmInvite>> => {
    const response = await apiClient.post('/firm/invite/existing', { caregiverId });
    return response.data;
  },

  inviteCaregiverByEmail: async (data: {
    email: string;
    fullName: string;
  }): Promise<ApiResponse<FirmInvite>> => {
    const response = await apiClient.post('/firm/invite/email', data);
    return response.data;
  },

  listInvites: async (): Promise<ApiResponse<FirmInvite[]>> => {
    const response = await apiClient.get('/firm/invites');
    return response.data;
  },
};
