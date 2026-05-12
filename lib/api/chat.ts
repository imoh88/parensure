import { apiClient } from './client';
import { ApiResponse, BackendConversation, BackendMessage } from '../types';

export const chatApi = {
  getOrCreateConversation: async (
    userId: string
  ): Promise<ApiResponse<BackendConversation>> => {
    const response = await apiClient.post('/chat/conversations', { userId });
    return response.data;
  },

  getConversations: async (): Promise<ApiResponse<BackendConversation[]>> => {
    const response = await apiClient.get('/chat/conversations');
    return response.data;
  },

  getMessages: async (conversationId: string): Promise<ApiResponse<BackendMessage[]>> => {
    const response = await apiClient.get(`/chat/conversations/${conversationId}/messages`);
    return response.data;
  },

  sendMessage: async (
    conversationId: string,
    content: string
  ): Promise<ApiResponse<BackendMessage>> => {
    const response = await apiClient.post(`/chat/conversations/${conversationId}/messages`, {
      content,
    });
    return response.data;
  },

  markRead: async (conversationId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.patch(`/chat/conversations/${conversationId}/read`);
    return response.data;
  },
};
