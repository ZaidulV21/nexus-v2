import { api } from '@/lib/api';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface InAppNotification {
  id: string;
  recipientId: string;
  recipientType: string;
  title: string;
  description: string;
  type: NotificationType;
  priority: NotificationPriority;
  relatedEntity?: string | null;
  relatedEntityId?: string | null;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export const notificationService = {
  list(params: { page?: number; pageSize?: number; isRead?: boolean } = {}) {
    const query: Record<string, string | number | boolean | undefined> = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    };
    if (typeof params.isRead === 'boolean') {
      query.isRead = params.isRead;
    }
    return api.getPaginated<InAppNotification>('/notifications', query);
  },

  getUnreadCount() {
    return api.get<UnreadCountResponse>('/notifications/unread-count');
  },

  markAsRead(id: string) {
    return api.patch<{ updated: number }>(`/notifications/${id}/read`);
  },

  markAllAsRead() {
    return api.patch<{ updated: number }>('/notifications/read-all');
  },
};
