import { prisma } from '../../config/database';

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
};
