import { prisma } from '../../config/database';
import { CreateServiceInput, UpdateServiceInput, ServiceListFilters } from './catalog.types';
import { PaginationParams } from '../../core/utils/pagination';

export const serviceRepository = {
  create(input: CreateServiceInput) {
    return prisma.service.create({ data: input as any, include: { category: true } });
  },

  update(id: string, input: UpdateServiceInput) {
    return prisma.service.update({ where: { id }, data: input as any, include: { category: true } });
  },

  disable(id: string) {
    return prisma.service.update({ where: { id }, data: { isActive: false }, include: { category: true } });
  },

  archive(id: string) {
    // Archived services are also deactivated so every "selectable service"
    // query (isActive: true) automatically excludes them.
    return prisma.service.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
      include: { category: true },
    });
  },

  restore(id: string) {
    return prisma.service.update({
      where: { id },
      data: { archivedAt: null, isActive: true },
      include: { category: true },
    });
  },

  findById(id: string) {
    return prisma.service.findFirst({ where: { id }, include: { category: true } });
  },

  // Case-insensitive exact-name lookup used for the duplicate-name guard.
  findByName(name: string, excludeId?: string) {
    return prisma.service.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  },

  // How many downstream records reference this service. A service with any
  // usage can never be deleted - only archived.
  async usageCounts(serviceId: string) {
    const [leadServices, projectServices, quotationItems] = await Promise.all([
      prisma.leadService.count({ where: { serviceId } }),
      prisma.projectService.count({ where: { serviceId } }),
      prisma.quotationItem.count({ where: { serviceId } }),
    ]);
    return {
      leadServices,
      projectServices,
      quotationItems,
      total: leadServices + projectServices + quotationItems,
    };
  },

  async list(pagination: PaginationParams, onlyActive: boolean, filters: ServiceListFilters = {}) {
    const where: any = {};

    if (onlyActive) {
      // Public callers only ever see selectable (active, non-archived) services.
      where.isActive = true;
      where.archivedAt = null;
    } else {
      switch (filters.status) {
        case 'ACTIVE':
          where.isActive = true;
          where.archivedAt = null;
          break;
        case 'INACTIVE':
          where.isActive = false;
          where.archivedAt = null;
          break;
        case 'ARCHIVED':
          where.archivedAt = { not: null };
          break;
        // 'ALL' or undefined - no status constraint
      }
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

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
