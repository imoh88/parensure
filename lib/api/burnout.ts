import { apiClient } from './client';
import { ApiResponse } from '../types';

export type WellnessPopupType =
  | 'MOOD_CHECK'
  | 'AFFIRMATION'
  | 'SLEEP_QUALITY'
  | 'WELLNESS_CHECK_IN'
  | 'OUTDOOR_EXPOSURE'
  | 'HYDRATION'
  | 'CR_MOOD_CHECK'
  | 'CR_WELLNESS_CHECK_IN'
  | 'CR_HYDRATION'
  | 'CR_OUTDOOR_EXPOSURE'
  | 'CR_GENTLE_CHANGE';

export const burnoutApi = {
  // ── Caregiver wellness ────────────────────────────────────────────────────
  getWellnessPrompt: async (): Promise<ApiResponse<{ popupType: WellnessPopupType | null }>> => {
    const response = await apiClient.get('/burnout/wellness/prompt');
    return response.data;
  },

  logWellnessResponse: async (data: {
    popupType: WellnessPopupType;
    response: string;
    snoozed?: boolean;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/burnout/wellness/log', data);
    return response.data;
  },

  // ── Care receiver wellness ────────────────────────────────────────────────
  getCareReceiverWellnessPrompt: async (): Promise<ApiResponse<{ popupType: WellnessPopupType | null }>> => {
    const response = await apiClient.get('/care-receiver/wellness/prompt');
    return response.data;
  },

  logCareReceiverWellnessResponse: async (data: {
    popupType: WellnessPopupType;
    response: string;
    snoozed?: boolean;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/care-receiver/wellness/log', data);
    return response.data;
  },
};
