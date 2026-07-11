import { prisma } from '../../config/database';

export const conversationRepository = {
  async findOrCreateForClient(clientId: string) {
    const existing = await prisma.conversation.findFirst({ where: { clientId } });
    if (existing) return existing;
    return prisma.conversation.create({ data: { clientId } });
  },

  findById(id: string) {
    return prisma.conversation.findFirst({ where: { id } });
  },

  findByClientId(clientId: string) {
    return prisma.conversation.findFirst({ where: { clientId } });
  },

  listAllWithLastMessage() {
    return prisma.conversation.findMany({
      include: {
        client: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
