import { apiClient } from './client';
import { ApiResponse, AuthResponse, User } from '../types';

export const authApi = {
  registerCareReceiver: async (data: {
    fullName: string;
    email: string;
    password?: string;
    phone?: string;
    dateOfBirth?: string;
    medicalNotes?: string;
    address?: string;
    emergencyContact?: string;
  }): Promise<ApiResponse<{ token: string; user: User; careReceiver: { id: string } }>> => {
    const response = await apiClient.post('/auth/register/care-receiver', data);
    return response.data;
  },

  registerCaregiver: async (data: {
    fullName: string;
    email: string;
    password?: string;
    phone?: string;
  }): Promise<ApiResponse<{ token: string; user: User }>> => {
    const response = await apiClient.post('/auth/register/caregiver', data);
    return response.data;
  },

  registerFirm: async (data: {
    fullName: string;
    firmName: string;
    email: string;
    password?: string;
    phone?: string;
    registrationNo?: string;
  }): Promise<ApiResponse<{ token: string; user: User }>> => {
    const response = await apiClient.post('/auth/register/firm', data);
    return response.data;
  },

  setPassword: async (data: {
    email: string;
    inviteToken: string;
    password: string;
  }): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/set-password', data);
    return response.data;
  },

  sendOtp: async (
    email: string,
    type: 'VERIFY_EMAIL' | 'RESET_PASSWORD'
  ): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/send-otp', { email, type });
    return response.data;
  },

  verifyEmail: async (data: { email: string; code: string }): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/verify-email', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  verifyResetCode: async (data: { email: string; code: string }): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/verify-reset-code', data);
    return response.data;
  },

  resetPassword: async (data: {
    email: string;
    newPassword: string;
  }): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/reset-password', data);
    return response.data;
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (data: {
    fullName?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    relationship?: string;
    country?: string;
    state?: string;
    city?: string;
    homeAddress?: string;
    timezone?: string;
    notes?: string;
    isProfileComplete?: boolean;
  }): Promise<ApiResponse<User>> => {
    const response = await apiClient.patch('/auth/profile', data);
    return response.data;
  },

  getProfileImageUploadUrl: async (): Promise<ApiResponse<{ url: string; key: string }>> => {
    const response = await apiClient.get('/auth/profile-image-url');
    return response.data;
  },

  saveProfileImageKey: async (key: string): Promise<ApiResponse<User>> => {
    const response = await apiClient.patch('/auth/profile-image', { key });
    return response.data;
  },

  getProfileImageDownloadUrl: async (): Promise<ApiResponse<{ url: string | null }>> => {
    const response = await apiClient.get('/auth/profile-image-download');
    return response.data;
  },

  registerDevice: async (fcmToken: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/device', { fcmToken });
    return response.data;
  },

  deleteAccount: async (): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete('/auth/account');
    return response.data;
  },

  addLinkedProfile: async (profileType: 'CAREGIVER' | 'CARE_RECEIVER'): Promise<ApiResponse<{ user: User }>> => {
    const response = await apiClient.post('/auth/add-profile', { profileType });
    return response.data;
  },

  sendPreRegOtp: async (email: string, phone?: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/send-pre-reg-otp', { email, phone });
    return response.data;
  },

  verifyPreRegOtp: async (email: string, code: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/verify-pre-reg-otp', { email, code });
    return response.data;
  },

  sendLoginOtp: async (identifier: { phone?: string; email?: string }): Promise<ApiResponse<null>> => {
    const response = await apiClient.post('/auth/send-login-otp', identifier);
    return response.data;
  },

  verifyLoginOtp: async (identifier: { phone?: string; email?: string }, code: string): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post('/auth/verify-login-otp', { ...identifier, code });
    return response.data;
  },
};
