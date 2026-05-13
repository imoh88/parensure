import { apiClient } from './client';
import { ApiResponse, CaregiverInvite, FirmInvite } from '../types';

export interface InvitePreview {
  inviteId: string;
  status: string;
  isFirstInvite: boolean;
  role: string;
  roleDescription: string;
  inviter: { name: string; firstName: string; photo: string | null };
  invitee: { name: string; firstName: string; photo: string | null };
  team: { totalCount: number; members: { name: string; photo: string | null }[] };
}

export const inviteApi = {
  getInvitePreview: async (inviteId: string): Promise<ApiResponse<InvitePreview>> => {
    const response = await apiClient.get(`/invite/${inviteId}/preview`);
    return response.data;
  },


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
