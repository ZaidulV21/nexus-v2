import { api } from '@/lib/api';
import type { Message } from '@/types';

export interface ConversationPreview {
  id: string;
  clientId: string;
  client?: { id: string; contactName: string; companyName?: string | null; email: string };
  messages: Message[];
  unreadCount?: number;
  createdAt: string;
}

export interface MessageListParams {
  page?: number;
  pageSize?: number;
}

export const messageService = {
  /** Admin: all client conversations with their latest message preview. */
  listConversations: () => api.get<ConversationPreview[]>('/conversations'),

  listMessages: (clientId: string, params: MessageListParams = {}) =>
    api.getPaginated<Message>(`/conversations/${clientId}/messages`, {
      page: params.page,
      pageSize: params.pageSize,
    }),

  send: (clientId: string, body: string) => api.post<Message>(`/conversations/${clientId}/messages`, { body }),

  markRead: (clientId: string) => api.patch<{ updated: number }>(`/conversations/${clientId}/messages/read`),
};
