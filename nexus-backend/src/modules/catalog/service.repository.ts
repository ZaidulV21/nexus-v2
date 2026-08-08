import { prisma } from '../../config/database';
import { CreateServiceInput, UpdateServiceInput, ServiceListFilters, BulkCatalogAction } from './catalog.types';
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

  publish(id: string) {
    return prisma.service.update({
      where: { id },
      data: { publicationState: 'PUBLISHED' },
      include: { category: true },
    });
  },

  draft(id: string) {
    return prisma.service.update({
      where: { id },
      data: { publicationState: 'DRAFT' },
      include: { category: true },
    });
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

  // Soft delete: hidden everywhere (public site + admin list) but still
  // attached to historical Leads/Quotations/Projects/Invoices. Never hard-deleted.
  softDelete(id: string) {
    return prisma.service.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      include: { category: true },
    });
  },

  // Restores visibility after a soft delete. Deliberately leaves isActive and
  // archivedAt untouched - the admin decides whether to reactivate.
  undelete(id: string) {
    return prisma.service.update({
      where: { id },
      data: { deletedAt: null },
      include: { category: true },
    });
  },

  findById(id: string) {
    return prisma.service.findFirst({ where: { id }, include: { category: true } });
  },

  findBySlug(slug: string) {
    return prisma.service.findFirst({ where: { slug }, include: { category: true } });
  },

  // Case-insensitive exact-name lookup used for the duplicate-name guard.
  // Soft-deleted services are excluded so their names can be reused after a
  // delete (the slug gets a numeric suffix to satisfy the unique constraint).
  findByName(name: string, excludeId?: string) {
    return prisma.service.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  },

  // How many downstream records reference this service. A service with any
  // usage can never be hard-deleted - only archived or soft-deleted.
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

  // Fetch the rows backing a bulk operation so the service layer can validate
  // every id exists and belongs to the right state before mutating.
  findManyByIds(ids: string[]) {
    return prisma.service.findMany({ where: { id: { in: ids } }, include: { category: true } });
  },

  // Applies one bulk action across many rows in a single transaction so a
  // partial application can never be observed. Deleted services always have
  // their isActive forced back to false by the same data that drives archive.
  bulk(ids: string[], action: BulkCatalogAction) {
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
      ids.map((id) => prisma.service.update({ where: { id }, data, include: { category: true } })),
    );
  },

  async list(pagination: PaginationParams, onlyActive: boolean, filters: ServiceListFilters = {}) {
    const where: any = {};

    if (onlyActive) {
      // Public callers only ever see published, selectable (active,
      // non-archived, non-deleted) services.
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
        // 'ALL' or undefined - everything except soft-deleted services, which
        // have their own dedicated status filter.
        default:
          where.deletedAt = null;
      }

      // Admin draft/published triage lives on top of the status filter.
      if (filters.publication === 'DRAFT') where.publicationState = 'DRAFT';
      if (filters.publication === 'PUBLISHED') where.publicationState = 'PUBLISHED';
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.featured === true) where.isFeatured = true;
    if (filters.popular === true) where.isPopular = true;

    if (pagination.search) {
      where.name = { contains: pagination.search, mode: 'insensitive' };
    }

    // Explicit sortBy wins (admin lists). The default ordering promotes
    // featured services first, then manual sortOrder, then name - so the
    // public website reflects CMS display settings automatically.
    const orderBy: any = pagination.sortBy
      ? [{ [pagination.sortBy]: pagination.sortOrder }]
      : [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }];

    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy,
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
