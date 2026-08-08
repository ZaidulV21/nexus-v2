import { prisma } from '../../config/database';
import {
  CreateContactMessageInput,
  ContactMessageListFilters,
} from './contact.types';

export const contactMessageRepository = {
  create(input: CreateContactMessageInput) {
    return prisma.contactMessage.create({
      data: {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim() || undefined,
        company: input.company?.trim() || undefined,
        subject: input.subject.trim(),
        message: input.message.trim(),
      },
    });
  },

  findById(id: string) {
    return prisma.contactMessage.findUnique({ where: { id } });
  },

  markRead(id: string) {
    return prisma.contactMessage.update({
      where: { id },
      data: { status: 'READ' },
    });
  },

  markReplied(id: string, replyBody: string, repliedById: string) {
    return prisma.contactMessage.update({
      where: { id },
      data: { status: 'REPLIED', replyBody, repliedById, repliedAt: new Date() },
    });
  },

  archive(id: string) {
    return prisma.contactMessage.update({
      where: { id },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });
  },

  restore(id: string) {
    return prisma.contactMessage.update({
      where: { id },
      data: { status: 'READ', archivedAt: null },
    });
  },

  async list(
    pagination: { page: number; pageSize: number },
    filters: ContactMessageListFilters = {},
  ) {
    const where: Record<string, unknown> = {};

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { company: { contains: filters.search, mode: 'insensitive' } },
        { subject: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.contactMessage.count({ where }),
    ]);

    return { items, total };
  },

  async counts() {
    const [newCount, unreadTotal] = await Promise.all([
      prisma.contactMessage.count({ where: { status: 'NEW' } }),
      prisma.contactMessage.count({ where: { status: { in: ['NEW', 'READ'] } } }),
    ]);
    return { new: newCount, unread: unreadTotal };
  },
};
