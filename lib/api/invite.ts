import { apiClient } from './client';
import { ApiResponse, CaregiverInvite, FirmInvite } from '../types';

export const inviteApi = {
  sendCaregiverInvite: async (caregiverId: string): Promise<ApiResponse<CaregiverInvite>> => {
    const response = await apiClient.post('/invite/caregiver', { caregiverId });
    return response.data;
  },

  respondToCaregiverInvite: async (
    inviteId: string,
    status: 'ACCEPTED' | 'DECLINED'
  ): Promise<ApiResponse<CaregiverInvite>> => {
    const response = await apiClient.patch(`/invite/caregiver/${inviteId}/respond`, { status });
    return response.data;
  },

  respondToFirmInvite: async (
    inviteId: string,
    status: 'ACCEPTED' | 'DECLINED'
  ): Promise<ApiResponse<FirmInvite>> => {
    const response = await apiClient.patch(`/invite/firm/${inviteId}/respond`, { status });
    return response.data;
  },

  sendCareReceiverEmailInvite: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.post('/invite/care-receiver/email', { email });
    return response.data;
  },
};
