import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import { PaginationParams } from '../../core/utils/pagination';

export const clientRepository = {
  create(
    data: { companyName?: string; contactName: string; phone: string; email: string; passwordHash: string; sourceLeadId: string },
    tx: Prisma.TransactionClient
  ) {
    return tx.client.create({ data });
  },

  findBySourceLeadId(leadId: string) {
    return prisma.client.findFirst({ where: { sourceLeadId: leadId } });
  },

  findByEmail(email: string) {
    return prisma.client.findFirst({ where: { email, deletedAt: null } });
  },

  findById(id: string) {
    return prisma.client.findFirst({ where: { id, deletedAt: null } });
  },

  update(id: string, data: Partial<{ companyName: string; contactName: string; phone: string }>) {
    return prisma.client.update({ where: { id }, data });
  },

  async list(pagination: PaginationParams) {
    const where: any = { deletedAt: null };
    if (pagination.search) {
      where.OR = [
        { companyName: { contains: pagination.search, mode: 'insensitive' } },
        { contactName: { contains: pagination.search, mode: 'insensitive' } },
        { email: { contains: pagination.search, mode: 'insensitive' } },
        { phone: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [pagination.sortBy || 'createdAt']: pagination.sortOrder },
      }),
      prisma.client.count({ where }),
    ]);
    return { items, total };
  },
};
