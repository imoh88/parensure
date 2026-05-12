import { apiClient } from './client';
import { ApiResponse, CaregiverProfile, FirmAffiliation } from '../types';

export const caregiverApi = {
  getProfile: async (): Promise<ApiResponse<CaregiverProfile>> => {
    const response = await apiClient.get('/caregiver/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<CaregiverProfile>): Promise<ApiResponse<CaregiverProfile>> => {
    const response = await apiClient.patch('/caregiver/profile', data);
    return response.data;
  },

  getReceivedInvites: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/caregiver/invites');
    return response.data;
  },

  getActiveContext: async (): Promise<ApiResponse<FirmAffiliation | null>> => {
    const response = await apiClient.get('/caregiver/context');
    return response.data;
  },

  switchContext: async (firmAffiliationId: string | null): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/caregiver/context/switch', { firmAffiliationId });
    return response.data;
  },

  getBookings: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/caregiver/bookings');
    return response.data;
  },

  searchCareReceivers: async (q?: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/caregiver/care-receivers/search', { params: { q } });
    return response.data;
  },

  addCareReceiver: async (careReceiverId: string, role?: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/caregiver/care-receivers/add', { careReceiverId, role });
    return response.data;
  },

  sendCareTeamInvite: async (data: { email: string; role: string; personalMessage?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/caregiver/care-receivers/invite', data);
    return response.data;
  },

  createTask: async (data: {
    careReceiverId: string;
    title: string;
    description?: string;
    category?: string;
    scheduledTimes?: string[];
    startDate?: string;
    endDate?: string;
    frequency?: string;
    priority?: string;
    reminderMinutes?: number;
    subtasks?: string[];
    attachments?: string[];
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/task', data);
    return response.data;
  },

  getTaskUploadUrl: async (filename: string, mimeType: string): Promise<ApiResponse<{ url: string; key: string }>> => {
    const response = await apiClient.get('/task/upload-url', { params: { filename, mimeType } });
    return response.data;
  },

  getTasks: async (careReceiverId?: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/task', { params: careReceiverId ? { careReceiverId } : undefined });
    return response.data;
  },

  updateTaskStatus: async (taskId: string, status: 'COMPLETED' | 'CANCELLED'): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/task/${taskId}/status`, { status });
    return response.data;
  },

  updateTask: async (taskId: string, data: Record<string, unknown>): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/task/${taskId}`, data);
    return response.data;
  },

  getCareReceiverProfile: async (careReceiverId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/caregiver/care-receivers/${careReceiverId}/profile`);
    return response.data;
  },

  getCareReceiverTeam: async (careReceiverId: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get(`/caregiver/care-receivers/${careReceiverId}/team`);
    return response.data;
  },

  removeBooking: async (bookingId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/caregiver/bookings/${bookingId}`);
    return response.data;
  },

  updateMemberRole: async (careReceiverId: string, bookingId: string, role: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/caregiver/care-receivers/${careReceiverId}/members/${bookingId}/role`, { role });
    return response.data;
  },

  toggleSosAlerts: async (careReceiverId: string, bookingId: string, enabled: boolean): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/caregiver/care-receivers/${careReceiverId}/members/${bookingId}/sos-alerts`, { enabled });
    return response.data;
  },

  searchTeamCaregivers: async (careReceiverId: string, q?: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get(`/caregiver/care-receivers/${careReceiverId}/members/search-caregiver`, { params: { q } });
    return response.data;
  },

  addCaregiverToTeam: async (careReceiverId: string, caregiverProfileId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/caregiver/care-receivers/${careReceiverId}/members/add-caregiver`, { caregiverProfileId });
    return response.data;
  },

  transferPrimaryOwnership: async (careReceiverId: string, newPrimaryCaregiverProfileId: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/caregiver/care-receivers/${careReceiverId}/transfer-primary`, { newPrimaryCaregiverProfileId });
    return response.data;
  },

  createAppointment: async (data: {
    careReceiverId: string;
    title: string;
    providerName?: string;
    providerPhone?: string;
    location?: string;
    notes?: string;
    scheduledTimes?: string[];
    startDate?: string;
    endDate?: string;
    reminderMinutes?: number;
    frequency?: string;
    priority?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/appointment', data);
    return response.data;
  },

  getAppointments: async (careReceiverId?: string): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/appointment', { params: careReceiverId ? { careReceiverId } : undefined });
    return response.data;
  },

  getMyTasks: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/task/mine');
    return response.data;
  },

  getMyAppointments: async (): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get('/appointment/mine');
    return response.data;
  },

  getActivityLog: async (careReceiverId: string, limit = 20): Promise<ApiResponse<any[]>> => {
    const response = await apiClient.get(`/caregiver/care-receivers/${careReceiverId}/activity`, { params: { limit } });
    return response.data;
  },

  scanMedication: async (base64Image: string, mimeType: string): Promise<ApiResponse<{
    name: string; dosage: string; rxNumber: string; instructions: string;
  }>> => {
    const response = await apiClient.post('/media/scan-medication', { image: base64Image, mimeType }, { timeout: 60000 });
    return response.data;
  },
};
