import { prisma } from '../../config/database';
import { CreateServiceInput, UpdateServiceInput } from './catalog.types';
import { PaginationParams } from '../../core/utils/pagination';

export const serviceRepository = {
  create(input: CreateServiceInput) {
    return prisma.service.create({ data: input as any });
  },

  update(id: string, input: UpdateServiceInput) {
    return prisma.service.update({ where: { id }, data: input as any });
  },

  disable(id: string) {
    return prisma.service.update({ where: { id }, data: { isActive: false } });
  },

  findById(id: string) {
    return prisma.service.findFirst({ where: { id }, include: { category: true } });
  },

  async list(pagination: PaginationParams, onlyActive: boolean) {
    const where: any = onlyActive ? { isActive: true } : {};
    if (pagination.search) {
      where.name = { contains: pagination.search, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [pagination.sortBy || 'name']: pagination.sortOrder },
        include: { category: true },
      }),
      prisma.service.count({ where }),
    ]);
    return { items, total };
  },

  getActiveQuestionnaire(serviceId: string) {
    return prisma.serviceQuestionnaire.findFirst({
      where: { serviceId, isActive: true },
      orderBy: { version: 'desc' },
    });
  },
};
