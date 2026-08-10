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

  // Phase 16 (performance): batch unread-count for a whole inbox in ONE
  // groupBy query instead of one count() per conversation (the previous
  // listAllConversations ran N+1 queries on the messages table).
  countUnreadForConversations(conversationIds: string[], forActorType: 'ADMIN' | 'CLIENT') {
    if (conversationIds.length === 0) return Promise.resolve([]);
    return prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversationIds },
        senderType: forActorType === 'ADMIN' ? 'CLIENT' : 'ADMIN',
        isRead: false,
      },
      _count: { _all: true },
    });
  },
};
