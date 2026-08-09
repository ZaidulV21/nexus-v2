import { prisma } from '../../config/database';
import { CreateServiceInput, UpdateServiceInput, ServiceListFilters, BulkCatalogAction } from './catalog.types';
import { PaginationParams } from '../../core/utils/pagination';

// Relations needed to assemble the legacy JSON API shape (features,
// whatsIncluded, process, faqs, testimonials + the 1:1 seo row). Children are
// returned already sorted by their manual sortOrder so the assembled arrays
// keep exactly the ordering the admin set in the CMS.
const SERVICE_INCLUDE: any = {
  category: true,
  featureItems: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  includedItems: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  processSteps: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  faqItems: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  testimonialItems: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  seo: true,
};

// Content/SEO keys are consumed below and translated into normalized rows, so
// they must never leak into the scalar spread of a create/update payload.
const CONTENT_KEYS = ['features', 'whatsIncluded', 'process', 'faqs', 'testimonials'] as const;
const SEO_KEYS = ['seoTitle', 'metaDescription', 'metaKeywords', 'ogImage', 'canonicalUrl', 'structuredData'] as const;

// A service with SEO that is entirely empty behaves exactly like one with no
// seo row at all, so a spurious row (e.g. a null ogImage clear on a service
// that never had SEO) is invisible to the API.
function hasUsableSeo(seo: any): boolean {
  if (!seo) return false;
  return Boolean(
    seo.seoTitle ||
      seo.metaDescription ||
      seo.metaKeywords ||
      seo.ogImage ||
      seo.canonicalUrl ||
      (seo.structuredData && typeof seo.structuredData === 'object' && Object.keys(seo.structuredData).length > 0),
  );
}

const EMPTY_SEO = { seoTitle: null, metaDescription: null, metaKeywords: null, ogImage: null, canonicalUrl: null, structuredData: {} };

// Rebuild the legacy API shape from the normalized child rows so public and
// admin callers keep receiving exactly the JSON arrays/SEO fields they always
// did. The child rows themselves are stripped from the payload.
function assembleService(service: any): any {
  if (!service) return service;
  const { featureItems, includedItems, processSteps, faqItems, testimonialItems, seo, ...rest } = service;
  const seoOut = hasUsableSeo(seo)
    ? {
        seoTitle: seo.seoTitle ?? null,
        metaDescription: seo.metaDescription ?? null,
        metaKeywords: seo.metaKeywords ?? null,
        ogImage: seo.ogImage ?? null,
        canonicalUrl: seo.canonicalUrl ?? null,
        structuredData: seo.structuredData ?? {},
      }
    : EMPTY_SEO;
  return {
    ...rest,
    features: (featureItems ?? []).map((f: any) => f.text),
    whatsIncluded: (includedItems ?? []).map((i: any) => i.text),
    process: (processSteps ?? []).map((p: any) => ({ title: p.title, description: p.description ?? '' })),
    faqs: (faqItems ?? []).map((f: any) => ({ question: f.question, answer: f.answer })),
    testimonials: (testimonialItems ?? []).map((t: any) => ({
      name: t.name,
      role: t.role ?? '',
      company: t.company ?? '',
      content: t.content,
      rating: t.rating,
      ...(t.avatar ? { avatar: t.avatar } : {}),
    })),
    ...seoOut,
  };
}

// Split a create/update payload into scalar columns + normalized child writes.
// `replace` toggles full replacement (delete all + recreate) vs plain create.
function splitServiceInput(input: Record<string, unknown>, replace: boolean) {
  const scalars: Record<string, unknown> = {};
  const children: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if ((CONTENT_KEYS as readonly string[]).includes(key) || (SEO_KEYS as readonly string[]).includes(key)) {
      children[key] = value;
    } else if (value !== undefined) {
      scalars[key] = value;
    }
  }

  const data: Record<string, unknown> = { ...scalars };

  const applyArray = (key: string, arr: unknown[] | undefined, toRow: (v: any, i: number) => Record<string, unknown>) => {
    if (arr === undefined) return;
    data[key] = { ...(replace ? { deleteMany: {} } : {}), create: arr.map(toRow) };
  };

  applyArray('featureItems', children.features as string[] | undefined, (v, i) => ({ text: v, sortOrder: i }));
  applyArray('includedItems', children.whatsIncluded as string[] | undefined, (v, i) => ({ text: v, sortOrder: i }));
  applyArray('processSteps', children.process as unknown[] | undefined, (v, i) => ({
    title: v.title,
    description: v.description,
    sortOrder: i,
  }));
  applyArray('faqItems', children.faqs as unknown[] | undefined, (v, i) => ({
    question: v.question,
    answer: v.answer,
    sortOrder: i,
  }));
  applyArray('testimonialItems', children.testimonials as unknown[] | undefined, (v, i) => ({
    name: v.name,
    role: v.role,
    company: v.company,
    content: v.content,
    rating: v.rating,
    avatar: v.avatar,
    sortOrder: i,
  }));

  const seo: Record<string, unknown> = {};
  let hasSeo = false;
  for (const key of SEO_KEYS) {
    if ((input as Record<string, unknown>)[key] !== undefined) {
      seo[key] = (input as Record<string, unknown>)[key];
      hasSeo = true;
    }
  }
  if (hasSeo) {
    if (replace) {
      // Prisma only exposes nested upsert on update; on update the seo row may
      // exist (previous writes) or not (first time SEO is set).
      data.seo = { upsert: { create: seo, update: seo } };
    } else if (
      // On create the row cannot exist yet - only create it when there is a
      // real value to store, so a service with no SEO keeps no seo row.
      Object.values(seo).some(
        (v) => v != null && (typeof v !== 'object' ? String(v).length > 0 : Object.keys(v as object).length > 0),
      )
    ) {
      data.seo = { create: seo };
    }
  }

  return data;
}

export const serviceRepository = {
  create(input: CreateServiceInput) {
    return prisma.service
      .create({
        data: splitServiceInput(input as unknown as Record<string, unknown>, false) as any,
        include: SERVICE_INCLUDE,
      })
      .then(assembleService);
  },

  update(id: string, input: UpdateServiceInput) {
    return prisma.service
      .update({
        where: { id },
        data: splitServiceInput(input as unknown as Record<string, unknown>, true) as any,
        include: SERVICE_INCLUDE,
      })
      .then(assembleService);
  },

  disable(id: string) {
    return prisma.service
      .update({ where: { id }, data: { isActive: false }, include: SERVICE_INCLUDE })
      .then(assembleService);
  },

  publish(id: string) {
    return prisma.service
      .update({ where: { id }, data: { publicationState: 'PUBLISHED' }, include: SERVICE_INCLUDE })
      .then(assembleService);
  },

  draft(id: string) {
    return prisma.service
      .update({ where: { id }, data: { publicationState: 'DRAFT' }, include: SERVICE_INCLUDE })
      .then(assembleService);
  },

  archive(id: string) {
    // Archived services are also deactivated so every "selectable service"
    // query (isActive: true) automatically excludes them.
    return prisma.service
      .update({
        where: { id },
        data: { archivedAt: new Date(), isActive: false },
        include: SERVICE_INCLUDE,
      })
      .then(assembleService);
  },

  restore(id: string) {
    return prisma.service
      .update({
        where: { id },
        data: { archivedAt: null, isActive: true },
        include: SERVICE_INCLUDE,
      })
      .then(assembleService);
  },

  // Soft delete: hidden everywhere (public site + admin list) but still
  // attached to historical Leads/Quotations/Projects/Invoices. Never hard-deleted.
  softDelete(id: string) {
    return prisma.service
      .update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
        include: SERVICE_INCLUDE,
      })
      .then(assembleService);
  },

  // Restores visibility after a soft delete. Deliberately leaves isActive and
  // archivedAt untouched - the admin decides whether to reactivate.
  undelete(id: string) {
    return prisma.service
      .update({ where: { id }, data: { deletedAt: null }, include: SERVICE_INCLUDE })
      .then(assembleService);
  },

  findById(id: string) {
    return prisma.service.findFirst({ where: { id }, include: SERVICE_INCLUDE }).then(assembleService);
  },

  findBySlug(slug: string) {
    return prisma.service.findFirst({ where: { slug }, include: SERVICE_INCLUDE }).then(assembleService);
  },

  // Case-insensitive exact-name lookup used for the duplicate-name guard.
  // Soft-deleted services are excluded so their names can be reused after a
  // delete (the slug gets a numeric suffix to satisfy the unique constraint).
  findByName(name: string, excludeId?: string) {
    return prisma.service
      .findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          deletedAt: null,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        include: SERVICE_INCLUDE,
      })
      .then(assembleService);
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
    return prisma.service
      .findMany({ where: { id: { in: ids } }, include: SERVICE_INCLUDE })
      .then((rows) => rows.map(assembleService));
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
    return prisma
      .$transaction(ids.map((id) => prisma.service.update({ where: { id }, data, include: SERVICE_INCLUDE })))
      .then((rows) => rows.map(assembleService));
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
        include: SERVICE_INCLUDE,
      }),
      prisma.service.count({ where }),
    ]);
    return { items: items.map(assembleService), total };
  },

  getActiveQuestionnaire(serviceId: string) {
    return prisma.serviceQuestionnaire.findFirst({
      where: { serviceId, isActive: true },
      orderBy: { version: 'desc' },
    });
  },
};
