import { api } from '@/lib/api';
import type { ContactMessage } from '@/types';

export interface CreateContactMessageInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
}

export type ContactMessageStatusFilter = 'ALL' | 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED';

export interface ContactMessageListParams {
  page?: number;
  pageSize?: number;
  status?: ContactMessageStatusFilter;
  search?: string;
}

export interface ContactMessageCounts {
  new: number;
  unread: number;
}

// Maps 1:1 to backend routes in src/modules/contact/contact.routes.ts. No
// business logic lives here - this is a pure transport layer.
export const contactService = {
  /** Public - visitors submit a support message from the /contact page. */
  submit: (input: CreateContactMessageInput) => api.post<ContactMessage>('/contact-messages', input),

  list: (params: ContactMessageListParams = {}) =>
    api.getPaginated<ContactMessage>('/contact-messages', {
      page: params.page,
      pageSize: params.pageSize,
      status: params.status && params.status !== 'ALL' ? params.status : undefined,
      search: params.search || undefined,
    }),

  counts: () => api.get<ContactMessageCounts>('/contact-messages/counts'),

  markRead: (id: string) => api.patch<ContactMessage>(`/contact-messages/${id}/read`),

  reply: (id: string, body: string) => api.post<ContactMessage>(`/contact-messages/${id}/reply`, { body }),

  archive: (id: string) => api.patch<ContactMessage>(`/contact-messages/${id}/archive`),

  restore: (id: string) => api.patch<ContactMessage>(`/contact-messages/${id}/restore`),
};
