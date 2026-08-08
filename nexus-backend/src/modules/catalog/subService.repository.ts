import { prisma } from '../../config/database';
import {
  CreateSubServiceInput,
  UpdateSubServiceInput,
  SubServiceListFilters,
  BulkCatalogAction,
} from './catalog.types';

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

  publish(id: string) {
    return prisma.subService.update({ where: { id }, data: { publicationState: 'PUBLISHED' } });
  },

  draft(id: string) {
    return prisma.subService.update({ where: { id }, data: { publicationState: 'DRAFT' } });
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

  // Fetch the rows backing a bulk operation so the service layer can validate
  // every id belongs to the right service and state before mutating.
  findManyByIds(serviceId: string, ids: string[]) {
    return prisma.subService.findMany({ where: { serviceId, id: { in: ids } } });
  },

  // Applies one bulk action across many rows under a service in a single
  // transaction, mirroring the service-level bulk operation.
  bulk(serviceId: string, ids: string[], action: BulkCatalogAction) {
    const data: Record<string, unknown> = { isActive: false };
    switch (action) {
      case 'archive':
        data.archivedAt = new Date();
        break;
      case 'restore':
        data.archivedAt = null;
        data.isActive = true;
        break;
      case 'delete':
        data.deletedAt = new Date();
        break;
      case 'undelete':
        data.deletedAt = null;
        break;
      case 'activate':
        data.isActive = true;
        break;
      case 'deactivate':
        data.isActive = false;
        break;
      case 'publish':
        data.publicationState = 'PUBLISHED';
        data.isActive = true;
        break;
      case 'draft':
        data.publicationState = 'DRAFT';
        break;
    }
    return prisma.$transaction(
      ids.map((id) => prisma.subService.update({ where: { id, serviceId }, data })),
    );
  },

  async listByService(
    serviceId: string,
    onlyActive: boolean,
    filters: SubServiceListFilters = {},
    pagination: { skip?: number; take?: number } = {},
  ) {
    const where: any = { serviceId };

    if (onlyActive) {
      where.publicationState = 'PUBLISHED';
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

      // Admin draft/published triage on top of the status filter.
      if (filters.publication === 'DRAFT') where.publicationState = 'DRAFT';
      if (filters.publication === 'PUBLISHED') where.publicationState = 'PUBLISHED';
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
