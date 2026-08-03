export interface EmitEventInput {
  eventType: string;
  entityType?: string;
  entityId?: string;
  payload: Record<string, unknown>;
  recipient: string;
  // Optional payment-scoped idempotency key. Payment notifications carry the
  // paymentId so the dedupe guard distinguishes two payments on the same
  // invoice while still ignoring a retry of the same payment. Invoice
  // lifecycle notifications omit it (dedup by eventType+entity).
  dedupeKey?: string;
  // Business-event-only flag. payment.successful and payment.recorded are
  // BUSINESS events (payment recording, invoice updates, timeline, audit, and
  // in-app notifications) and must never send an email - the single automatic
  // receipt email is delivered via payment.receipt_available. When false, the
  // event + in-app notifications are still recorded but NO email is dispatched
  // and no EMAIL log row is written. Defaults to true (email sent) for every
  // other notification type.
  sendEmail?: boolean;
}

export type EmailStatus = 'SENT' | 'SKIPPED' | 'FAILED';

export interface EmitEventResult {
  notificationEventId: string;
  emailStatus: EmailStatus;
  emailErrorMessage?: string;
  notificationLogId?: string;
  deduplicated: boolean;
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
