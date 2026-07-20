export interface EmitEventInput {
  eventType: string;
  entityType?: string;
  entityId?: string;
  payload: Record<string, unknown>;
  recipient: string;
}

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type NotificationRecipientType = 'ADMIN' | 'CLIENT';

export interface CreateInAppNotificationInput {
  recipientId: string;
  recipientType: NotificationRecipientType;
  title: string;
  description: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  relatedEntity?: string;
  relatedEntityId?: string;
  actionUrl?: string;
}

export interface ListNotificationsParams {
  recipientId: string;
  recipientType: NotificationRecipientType;
  isRead?: boolean;
  page: number;
  pageSize: number;
}

export interface EventNotificationMapping {
  title: string | ((payload: Record<string, unknown>) => string);
  description: string | ((payload: Record<string, unknown>) => string);
  type: NotificationType;
  priority: NotificationPriority;
  adminTitle?: string | ((payload: Record<string, unknown>) => string);
  adminDescription?: string | ((payload: Record<string, unknown>) => string);
  adminActionUrl?: (entityId: string) => string;
  clientTitle?: string | ((payload: Record<string, unknown>) => string);
  clientDescription?: string | ((payload: Record<string, unknown>) => string);
  clientActionUrl?: (entityId: string) => string;
  relatedEntity?: string;
  actionUrl?: (entityId: string) => string;
}
