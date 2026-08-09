import { prisma } from '../../config/database';
import {
  CreateSubServiceInput,
  UpdateSubServiceInput,
  SubServiceListFilters,
  BulkCatalogAction,
} from './catalog.types';

// Relations needed to assemble the legacy JSON API shape (gallery, features,
// whatsIncluded, process, faqs + the 1:1 seo row). Children come back already
// sorted by their manual sortOrder so the assembled arrays preserve the admin's
// ordering exactly.
const SUB_SERVICE_INCLUDE: any = {
  featureItems: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  includedItems: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  processSteps: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  faqItems: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  mediaItems: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  seo: true,
};

const CONTENT_KEYS = ['gallery', 'features', 'whatsIncluded', 'process', 'faqs'] as const;
const SEO_KEYS = ['seoTitle', 'metaDescription', 'metaKeywords', 'ogImage', 'canonicalUrl', 'structuredData'] as const;

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

// Rebuild the legacy API shape from the normalized child rows. `gallery` is
// the plain list of media URLs in admin order (mirrors the old string[]).
function assembleSubService(subService: any): any {
  if (!subService) return subService;
  const { featureItems, includedItems, processSteps, faqItems, mediaItems, seo, ...rest } = subService;
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
    gallery: (mediaItems ?? []).map((m: any) => m.url),
    features: (featureItems ?? []).map((f: any) => f.text),
    whatsIncluded: (includedItems ?? []).map((i: any) => i.text),
    process: (processSteps ?? []).map((p: any) => ({ title: p.title, description: p.description ?? '' })),
    faqs: (faqItems ?? []).map((f: any) => ({ question: f.question, answer: f.answer })),
    ...seoOut,
  };
}

// Split a create/update payload into scalar columns + normalized child writes.
function splitSubServiceInput(input: Record<string, unknown>, replace: boolean) {
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

  applyArray('mediaItems', children.gallery as string[] | undefined, (v, i) => ({
    url: v,
    sortOrder: i,
    isActive: true,
  }));
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
      // real value to store, so a sub-service with no SEO keeps no seo row.
      Object.values(seo).some(
        (v) => v != null && (typeof v !== 'object' ? String(v).length > 0 : Object.keys(v as object).length > 0),
      )
    ) {
      data.seo = { create: seo };
    }
  }

  return data;
}

export const subServiceRepository = {
  create(serviceId: string, input: CreateSubServiceInput) {
    return prisma.subService
      .create({
        data: { ...splitSubServiceInput(input as unknown as Record<string, unknown>, false), serviceId } as any,
        include: SUB_SERVICE_INCLUDE,
      })
      .then(assembleSubService);
  },

  update(id: string, input: UpdateSubServiceInput) {
    return prisma.subService
      .update({
        where: { id },
        data: splitSubServiceInput(input as unknown as Record<string, unknown>, true) as any,
        include: SUB_SERVICE_INCLUDE,
      })
      .then(assembleSubService);
  },

  disable(id: string) {
    return prisma.subService
      .update({ where: { id }, data: { isActive: false }, include: SUB_SERVICE_INCLUDE })
      .then(assembleSubService);
  },

  publish(id: string) {
    return prisma.subService
      .update({ where: { id }, data: { publicationState: 'PUBLISHED' }, include: SUB_SERVICE_INCLUDE })
      .then(assembleSubService);
  },

  draft(id: string) {
    return prisma.subService
      .update({ where: { id }, data: { publicationState: 'DRAFT' }, include: SUB_SERVICE_INCLUDE })
      .then(assembleSubService);
  },

  archive(id: string) {
    // Archived sub-services are also deactivated so every public query
    // (isActive: true) automatically excludes them.
    return prisma.subService
      .update({
        where: { id },
        data: { archivedAt: new Date(), isActive: false },
        include: SUB_SERVICE_INCLUDE,
      })
      .then(assembleSubService);
  },

  restore(id: string) {
    return prisma.subService
      .update({
        where: { id },
        data: { archivedAt: null, isActive: true },
        include: SUB_SERVICE_INCLUDE,
      })
      .then(assembleSubService);
  },

  // Soft delete: hidden everywhere but always reversible. A sub-service is
  // never hard-deleted (same policy as services).
  softDelete(id: string) {
    return prisma.subService
      .update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
        include: SUB_SERVICE_INCLUDE,
      })
      .then(assembleSubService);
  },

  // Restores visibility after a soft delete. Deliberately leaves isActive and
  // archivedAt untouched - the admin decides whether to reactivate.
  undelete(id: string) {
    return prisma.subService
      .update({ where: { id }, data: { deletedAt: null }, include: SUB_SERVICE_INCLUDE })
      .then(assembleSubService);
  },

  findById(id: string) {
    return prisma.subService.findFirst({ where: { id }, include: SUB_SERVICE_INCLUDE }).then(assembleSubService);
  },

  findByServiceAndSlug(serviceId: string, slug: string) {
    return prisma.subService
      .findFirst({ where: { serviceId, slug }, include: SUB_SERVICE_INCLUDE })
      .then(assembleSubService);
  },

  // Case-insensitive exact-name lookup within a service, used for the
  // duplicate-name guard. Soft-deleted rows are excluded so their names can be
  // reused after a delete (the slug gets a numeric suffix for uniqueness).
  findByName(serviceId: string, name: string, excludeId?: string) {
    return prisma.subService
      .findFirst({
        where: {
          serviceId,
          name: { equals: name, mode: 'insensitive' },
          deletedAt: null,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        include: SUB_SERVICE_INCLUDE,
      })
      .then(assembleSubService);
  },

  // Fetch the rows backing a bulk operation so the service layer can validate
  // every id belongs to the right service and state before mutating.
  findManyByIds(serviceId: string, ids: string[]) {
    return prisma.subService
      .findMany({ where: { serviceId, id: { in: ids } }, include: SUB_SERVICE_INCLUDE })
      .then((rows) => rows.map(assembleSubService));
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
    return prisma
      .$transaction(ids.map((id) => prisma.subService.update({ where: { id, serviceId }, data, include: SUB_SERVICE_INCLUDE })))
      .then((rows) => rows.map(assembleSubService));
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
        include: SUB_SERVICE_INCLUDE,
      }),
      prisma.subService.count({ where }),
    ]);
    return { items: items.map(assembleSubService), total };
  },

  // Bulk-apply a manual sort order. Runs in a single transaction so the
  // ordered list can never be left half-applied.
  reorder(orderedIds: string[]) {
    return prisma
      .$transaction(
        orderedIds.map((id, index) =>
          prisma.subService.update({ where: { id }, data: { sortOrder: index }, include: SUB_SERVICE_INCLUDE }),
        ),
      )
      .then((rows) => rows.map(assembleSubService));
  },
};
