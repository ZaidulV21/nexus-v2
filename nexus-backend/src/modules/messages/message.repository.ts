import { prisma } from '../../config/database';
import { PaginationParams } from '../../core/utils/pagination';

export const messageRepository = {
  create(data: {
    conversationId: string;
    senderType: 'ADMIN' | 'CLIENT';
    senderUserId?: string;
    senderClientId?: string;
    body: string;
  }) {
    return prisma.message.create({ data });
  },

  async listForConversation(conversationId: string, pagination: PaginationParams) {
    const [items, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);
    return { items, total };
  },

  markAllReadForConversation(conversationId: string, exceptSenderType: 'ADMIN' | 'CLIENT') {
    // Marks read the messages sent by the OTHER party - i.e. when an Admin
    // reads a conversation, Client-sent messages become read, and vice versa.
    return prisma.message.updateMany({
      where: { conversationId, senderType: exceptSenderType === 'ADMIN' ? 'CLIENT' : 'ADMIN', isRead: false },
      data: { isRead: true },
    });
  },

  countUnreadForConversation(conversationId: string, forActorType: 'ADMIN' | 'CLIENT') {
    return prisma.message.count({
      where: {
        conversationId,
        senderType: forActorType === 'ADMIN' ? 'CLIENT' : 'ADMIN',
        isRead: false,
      },
    });
  },
};
