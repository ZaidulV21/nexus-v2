import { notificationsRepository } from './notifications.repository';
import { notificationsDispatcher } from './notifications.dispatcher';
import {
  EmitEventInput,
  CreateInAppNotificationInput,
  ListNotificationsParams,
  EventNotificationMapping,
  NotificationRecipientType,
} from './notifications.types';

const KNOWN_EVENT_TYPES = new Set([
  'lead.created',
  'quotation.approved',
  'quotation.sent',
  'quotation.revision_requested',
  'quotation.accepted',
  'quotation.rejected',
  'client.account.created',
  'project.created',
  'invoice.issued',
  'invoice.cancelled',
  'payment.recorded',
  'project.completed',
  'message.received',
  'document.uploaded',
  'lead.archived',
  'lead.restored',
  'project.status_changed',
  'invoice.overdue',
  'payment.receipt_sent',
]);

function resolve(
  value: string | ((payload: Record<string, unknown>) => string),
  payload: Record<string, unknown>
): string {
  return typeof value === 'function' ? value(payload) : value;
}

const EVENT_NOTIFICATION_MAP: Record<string, EventNotificationMapping> = {
  'lead.created': {
    title: 'New lead created',
    description: (p) => `Lead ${p.leadNumber} has been created`,
    type: 'INFO',
    priority: 'NORMAL',
    relatedEntity: 'LEAD',
    actionUrl: (id) => `/leads/${id}`,
  },
  'client.account.created': {
    title: 'Lead converted to Client',
    description: (p) => `A lead has been converted to a Client account`,
    type: 'SUCCESS',
    priority: 'NORMAL',
    relatedEntity: 'CLIENT',
    adminTitle: 'Lead converted to Client',
    adminDescription: () => 'A lead has been converted to a Client account',
    adminActionUrl: (id) => `/clients/${id}`,
    clientTitle: 'Welcome! Your account is ready',
    clientDescription: () => 'Your account has been created. You can now log in and view your quotations.',
    clientActionUrl: () => '/portal',
  },
  'quotation.approved': {
    title: 'Quotation approved',
    description: (p) => `Quotation ${p.quotationNumber || ''} has been approved`,
    type: 'SUCCESS',
    priority: 'NORMAL',
    relatedEntity: 'QUOTATION',
    actionUrl: (id) => `/quotations/${id}`,
  },
  'quotation.sent': {
    title: 'Quotation sent',
    description: (p) => `Quotation ${p.quotationNumber || ''} has been sent to the client`,
    type: 'INFO',
    priority: 'NORMAL',
    relatedEntity: 'QUOTATION',
    adminTitle: 'Quotation sent',
    adminDescription: (p) => `Quotation ${p.quotationNumber || ''} has been sent to the client`,
    adminActionUrl: (id) => `/quotations/${id}`,
    clientTitle: (p) => (p.resend ? 'Revised quotation available' : 'New quotation available'),
    clientDescription: (p) => (p.resend
      ? 'A revised quotation has been shared with you'
      : 'A new quotation has been shared with you'),
    clientActionUrl: (id) => `/portal/quotations/${id}`,
  },
  'quotation.revision_requested': {
    title: 'Revision requested',
    description: (p) => `Client requested revision for quotation ${p.quotationNumber || ''}`,
    type: 'WARNING',
    priority: 'HIGH',
    relatedEntity: 'QUOTATION',
    actionUrl: (id) => `/quotations/${id}`,
  },
  'quotation.accepted': {
    title: 'Quotation accepted',
    description: () => 'Client has accepted the quotation',
    type: 'SUCCESS',
    priority: 'HIGH',
    relatedEntity: 'QUOTATION',
    adminTitle: 'Quotation accepted',
    adminDescription: () => 'Client has accepted the quotation',
    adminActionUrl: (id) => `/quotations/${id}`,
    clientTitle: 'Quotation accepted',
    clientDescription: () => 'Your quotation has been accepted. A project will be created shortly.',
    clientActionUrl: () => '/portal/projects',
  },
  'quotation.rejected': {
    title: 'Quotation rejected',
    description: () => 'Client has rejected the quotation',
    type: 'WARNING',
    priority: 'HIGH',
    relatedEntity: 'QUOTATION',
    actionUrl: (id) => `/quotations/${id}`,
  },
  'project.created': {
    title: 'Project created',
    description: (p) => `Project ${p.projectNumber || ''} has been created`,
    type: 'SUCCESS',
    priority: 'NORMAL',
    relatedEntity: 'PROJECT',
    adminTitle: 'Project created',
    adminDescription: (p) => `Project ${p.projectNumber || ''} has been created`,
    adminActionUrl: (id) => `/projects/${id}`,
    clientTitle: 'Your project has been created',
    clientDescription: () => 'A new project has been created from your accepted quotation',
    clientActionUrl: (id) => `/portal/projects/${id}`,
  },
  'project.completed': {
    title: 'Project completed',
    description: () => 'Project has been marked as completed',
    type: 'SUCCESS',
    priority: 'NORMAL',
    relatedEntity: 'PROJECT',
    adminTitle: 'Project completed',
    adminDescription: () => 'A project has been marked as completed',
    adminActionUrl: (id) => `/projects/${id}`,
    clientTitle: 'Your project is complete',
    clientDescription: () => 'Your project has been completed',
    clientActionUrl: (id) => `/portal/projects/${id}`,
  },
  'project.status_changed': {
    title: 'Project status changed',
    description: (p) => `Project status updated to ${p.toStatus || ''}`,
    type: 'INFO',
    priority: 'NORMAL',
    relatedEntity: 'PROJECT',
    adminTitle: 'Project status changed',
    adminDescription: (p) => `Project status updated to ${p.toStatus || ''}`,
    adminActionUrl: (id) => `/projects/${id}`,
    clientTitle: 'Project status updated',
    clientDescription: (p) => `Your project status has been updated to ${p.toStatus || ''}`,
    clientActionUrl: (id) => `/portal/projects/${id}`,
  },
  'invoice.issued': {
    title: 'Invoice created',
    description: (p) => `Invoice ${p.invoiceNumber || ''} has been created`,
    type: 'INFO',
    priority: 'NORMAL',
    relatedEntity: 'INVOICE',
    adminTitle: 'Invoice created',
    adminDescription: (p) => `Invoice ${p.invoiceNumber || ''} has been created`,
    adminActionUrl: (id) => `/invoices/${id}`,
    clientTitle: 'New invoice',
    clientDescription: (p) => `Invoice ${p.invoiceNumber || ''} has been issued`,
    clientActionUrl: (id) => `/portal/invoices/${id}`,
  },
  'invoice.cancelled': {
    title: 'Invoice cancelled',
    description: (p) => `Invoice ${p.invoiceNumber || ''} has been cancelled`,
    type: 'WARNING',
    priority: 'HIGH',
    relatedEntity: 'INVOICE',
    actionUrl: (id) => `/invoices/${id}`,
  },
  'payment.recorded': {
    title: 'Payment recorded',
    description: (p) => `Payment of ${p.amount || ''} recorded for invoice ${p.invoiceNumber || ''}`,
    type: 'SUCCESS',
    priority: 'NORMAL',
    relatedEntity: 'INVOICE',
    adminTitle: 'Payment recorded',
    adminDescription: (p) => `Payment of ${p.amount || ''} recorded for invoice ${p.invoiceNumber || ''}`,
    adminActionUrl: (id) => `/invoices/${id}`,
    clientTitle: 'Payment received',
    clientDescription: (p) => `Your payment of ${p.amount || ''} for invoice ${p.invoiceNumber || ''} has been recorded`,
    clientActionUrl: (id) => `/portal/invoices/${id}`,
  },
  'message.received': {
    title: 'New message',
    description: (p) => `New message from ${p.senderName || 'a user'}`,
    type: 'INFO',
    priority: 'NORMAL',
    relatedEntity: 'CONVERSATION',
    adminTitle: 'New client message',
    adminDescription: (p) => `New message received${p.preview ? `: ${p.preview}` : ''}`,
    adminActionUrl: () => `/messages`,
    clientTitle: 'New message from admin',
    clientDescription: () => 'You have a new message',
    clientActionUrl: () => '/portal/messages',
  },
  'document.uploaded': {
    title: 'Document uploaded',
    description: (p) => `Document "${p.fileName || ''}" has been uploaded`,
    type: 'INFO',
    priority: 'LOW',
    relatedEntity: 'DOCUMENT',
    adminTitle: 'Document uploaded',
    adminDescription: (p) => `Document "${p.fileName || ''}" has been uploaded`,
    adminActionUrl: () => `/documents`,
    clientTitle: 'New document shared',
    clientDescription: (p) => `A new document "${p.fileName || ''}" has been shared with you`,
    clientActionUrl: () => '/portal/documents',
  },
  'lead.archived': {
    title: 'Lead archived',
    description: (p) => `Lead ${p.leadNumber || ''} has been archived`,
    type: 'INFO',
    priority: 'LOW',
    relatedEntity: 'LEAD',
    actionUrl: (id) => `/leads/${id}`,
  },
  'lead.restored': {
    title: 'Lead restored',
    description: (p) => `Lead ${p.leadNumber || ''} has been restored from archive`,
    type: 'INFO',
    priority: 'LOW',
    relatedEntity: 'LEAD',
    actionUrl: (id) => `/leads/${id}`,
  },
  'invoice.overdue': {
    title: 'Invoice overdue',
    description: (p) => `Invoice ${p.invoiceNumber || ''} is now overdue`,
    type: 'ERROR',
    priority: 'HIGH',
    relatedEntity: 'INVOICE',
    actionUrl: (id) => `/invoices/${id}`,
  },
  'payment.receipt_sent': {
    title: 'Payment receipt sent',
    description: (p) => `Payment receipt for invoice ${p.invoiceNumber || ''} sent to client`,
    type: 'SUCCESS',
    priority: 'NORMAL',
    relatedEntity: 'INVOICE',
    adminTitle: 'Payment receipt sent',
    adminDescription: (p) => `Receipt for ${p.amount || ''} sent for invoice ${p.invoiceNumber || ''}`,
    adminActionUrl: (id) => `/invoices/${id}`,
  },
};

export const notificationsService = {
  async emitEvent(input: EmitEventInput) {
    if (!KNOWN_EVENT_TYPES.has(input.eventType)) {
      // eslint-disable-next-line no-console
      console.warn(`[notifications] Unknown event type ignored: ${input.eventType}`);
      return;
    }

    const event = await notificationsRepository.createEvent({
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload as any,
    });

    // In-App notifications (fire-and-forget, never block the business transaction)
    this.createInAppNotificationsFromEvent(input).catch(() => {});

    try {
      await notificationsDispatcher.dispatch('EMAIL', input.recipient, input.payload);
      await notificationsRepository.createLog({
        notificationEventId: event.id,
        channel: 'EMAIL',
        recipient: input.recipient,
        status: 'SENT',
        sentAt: new Date(),
      });
    } catch (err) {
      await notificationsRepository.createLog({
        notificationEventId: event.id,
        channel: 'EMAIL',
        recipient: input.recipient,
        status: 'FAILED',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  },

  async createInAppNotificationsFromEvent(input: EmitEventInput) {
    const mapping = EVENT_NOTIFICATION_MAP[input.eventType];
    if (!mapping) return;

    const notifications: CreateInAppNotificationInput[] = [];
    const payload = input.payload;

    // Admin notifications
    if (mapping.adminTitle || (!mapping.clientTitle && !mapping.adminTitle)) {
      const adminUsers = await notificationsRepository.findAllAdminUserIds();
      const title = mapping.adminTitle || mapping.title;
      const description = mapping.adminDescription || mapping.description;
      const urlFn = mapping.adminActionUrl || mapping.actionUrl;

      for (const user of adminUsers) {
        notifications.push({
          recipientId: user.id,
          recipientType: 'ADMIN',
          title: resolve(title, payload),
          description: resolve(description, payload),
          type: mapping.type,
          priority: mapping.priority,
          relatedEntity: mapping.relatedEntity,
          relatedEntityId: input.entityId,
          actionUrl: urlFn && input.entityId ? urlFn(input.entityId) : undefined,
        });
      }
    }

    // Client notifications
    if (mapping.clientTitle && input.entityType) {
      const clientId = this.extractClientIdFromPayload(payload, input.entityType);
      if (clientId) {
        const urlFn = mapping.clientActionUrl || mapping.actionUrl;
        notifications.push({
          recipientId: clientId,
          recipientType: 'CLIENT',
          title: resolve(mapping.clientTitle, payload),
          description: resolve(mapping.clientDescription || mapping.description, payload),
          type: mapping.type,
          priority: mapping.priority,
          relatedEntity: mapping.relatedEntity,
          relatedEntityId: input.entityId,
          actionUrl: urlFn && input.entityId ? urlFn(input.entityId) : urlFn ? urlFn('') : undefined,
        });
      }
    }

    await notificationsRepository.createManyInAppNotifications(notifications);
  },

  extractClientIdFromPayload(payload: Record<string, unknown>, entityType: string): string | null {
    if (typeof payload.clientId === 'string') return payload.clientId;
    if (typeof payload.recipientClientId === 'string') return payload.recipientClientId;
    return null;
  },

  async createInAppNotification(input: CreateInAppNotificationInput) {
    return notificationsRepository.createInAppNotification(input);
  },

  async listByRecipient(params: ListNotificationsParams) {
    const [items, total] = await Promise.all([
      notificationsRepository.listByRecipient(params),
      notificationsRepository.countByRecipient(params.recipientId, params.recipientType, params.isRead),
    ]);
    return { items, total };
  },

  async getUnreadCount(recipientId: string, recipientType: NotificationRecipientType) {
    return notificationsRepository.countUnread(recipientId, recipientType);
  },

  async markAsRead(id: string, recipientId: string) {
    return notificationsRepository.markAsRead(id, recipientId);
  },

  async markAllAsRead(recipientId: string, recipientType: NotificationRecipientType) {
    return notificationsRepository.markAllAsRead(recipientId, recipientType);
  },

  async getLogs() {
    return notificationsRepository.listLogs();
  },
};
