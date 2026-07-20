import { prisma } from '../../config/database';
import { CreateInAppNotificationInput, ListNotificationsParams } from './notifications.types';

export const notificationsRepository = {
  createEvent(data: { eventType: string; entityType?: string; entityId?: string; payload: any }) {
    return prisma.notificationEvent.create({ data });
  },

  createLog(data: {
    notificationEventId: string;
    channel: string;
    recipient: string;
    status: string;
    sentAt?: Date;
    errorMessage?: string;
  }) {
    return prisma.notificationLog.create({ data });
  },

  listLogs() {
    return prisma.notificationLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  },

  // ── In-App Notification CRUD ────────────────────────────────────────

  createInAppNotification(data: CreateInAppNotificationInput) {
    return prisma.inAppNotification.create({ data });
  },

  createManyInAppNotifications(inputs: CreateInAppNotificationInput[]) {
    if (inputs.length === 0) return Promise.resolve({ count: 0 });
    return prisma.inAppNotification.createMany({ data: inputs });
  },

  listByRecipient(params: ListNotificationsParams) {
    const where: any = {
      recipientId: params.recipientId,
      recipientType: params.recipientType,
    };
    if (typeof params.isRead === 'boolean') {
      where.isRead = params.isRead;
    }

    return prisma.inAppNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    });
  },

  countByRecipient(recipientId: string, recipientType: string, isRead?: boolean) {
    const where: any = { recipientId, recipientType };
    if (typeof isRead === 'boolean') {
      where.isRead = isRead;
    }
    return prisma.inAppNotification.count({ where });
  },

  countUnread(recipientId: string, recipientType: string) {
    return prisma.inAppNotification.count({
      where: { recipientId, recipientType, isRead: false },
    });
  },

  markAsRead(id: string, recipientId: string) {
    return prisma.inAppNotification.updateMany({
      where: { id, recipientId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },

  markAllAsRead(recipientId: string, recipientType: string) {
    return prisma.inAppNotification.updateMany({
      where: { recipientId, recipientType, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },

  findAllAdminUserIds() {
    return prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
  },
};
