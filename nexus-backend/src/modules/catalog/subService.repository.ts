import { prisma } from '../../config/database';
import { CreateSubServiceInput, UpdateSubServiceInput, SubServiceListFilters } from './catalog.types';

export const subServiceRepository = {
  create(serviceId: string, input: CreateSubServiceInput) {
    return prisma.subService.create({ data: { ...input, serviceId } as any });
  },

  update(id: string, input: UpdateSubServiceInput) {
    return prisma.subService.update({ where: { id }, data: input as any });
  },

  disable(id: string) {
    return prisma.subService.update({ where: { id }, data: { isActive: false } });
  },

  archive(id: string) {
    // Archived sub-services are also deactivated so every public query
    // (isActive: true) automatically excludes them.
    return prisma.subService.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });
  },

  restore(id: string) {
    return prisma.subService.update({
      where: { id },
      data: { archivedAt: null, isActive: true },
    });
  },

  // Soft delete: hidden everywhere but always reversible. A sub-service is
  // never hard-deleted (same policy as services).
  softDelete(id: string) {
    return prisma.subService.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  },

  // Restores visibility after a soft delete. Deliberately leaves isActive and
  // archivedAt untouched - the admin decides whether to reactivate.
  undelete(id: string) {
    return prisma.subService.update({
      where: { id },
      data: { deletedAt: null },
    });
  },

  findById(id: string) {
    return prisma.subService.findFirst({ where: { id } });
  },

  findByServiceAndSlug(serviceId: string, slug: string) {
    return prisma.subService.findFirst({ where: { serviceId, slug } });
  },

  // Case-insensitive exact-name lookup within a service, used for the
  // duplicate-name guard. Soft-deleted rows are excluded so their names can be
  // reused after a delete (the slug gets a numeric suffix for uniqueness).
  findByName(serviceId: string, name: string, excludeId?: string) {
    return prisma.subService.findFirst({
      where: {
        serviceId,
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  },

  async listByService(
    serviceId: string,
    onlyActive: boolean,
    filters: SubServiceListFilters = {},
    pagination: { skip?: number; take?: number } = {},
  ) {
    const where: any = { serviceId };

    if (onlyActive) {
      where.isActive = true;
      where.archivedAt = null;
      where.deletedAt = null;
    } else {
      switch (filters.status) {
        case 'ACTIVE':
          where.isActive = true;
          where.archivedAt = null;
          where.deletedAt = null;
          break;
        case 'INACTIVE':
          where.isActive = false;
          where.archivedAt = null;
          where.deletedAt = null;
          break;
        case 'ARCHIVED':
          where.archivedAt = { not: null };
          where.deletedAt = null;
          break;
        case 'DELETED':
          where.deletedAt = { not: null };
          break;
        // 'ALL' or undefined - everything except soft-deleted rows.
        default:
          where.deletedAt = null;
      }
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.subService.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.subService.count({ where }),
    ]);
    return { items, total };
  },

  // Bulk-apply a manual sort order. Runs in a single transaction so the
  // ordered list can never be left half-applied.
  reorder(orderedIds: string[]) {
    return prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.subService.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
  },
};
