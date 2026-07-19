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
        // Summary only - the full Client record carries passwordHash and
        // must never leave the API.
        client: {
          select: { id: true, clientNumber: true, contactName: true, companyName: true, email: true, phone: true },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
