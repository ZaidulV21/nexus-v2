import { serviceRepository } from './service.repository';
import { categoryRepository } from './category.repository';
import { CreateServiceInput, UpdateServiceInput, ServiceListFilters } from './catalog.types';
import { PaginationParams } from '../../core/utils/pagination';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors/AppError';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';

// Mirrors the frontend slugify() (nexus-frontend/src/lib/utils.ts) so slugs
// backfilled from names produce identical URLs to what the public site used
// before the CMS. \w == [A-Za-z0-9_].
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Every image slot the CMS can manage on a service.
export const SERVICE_IMAGE_FIELDS = ['imageUrl', 'bannerImage', 'thumbnail', 'heroImage', 'ogImage'] as const;
export type ServiceImageField = (typeof SERVICE_IMAGE_FIELDS)[number];

const IMAGE_FIELD_LABELS: Record<ServiceImageField, string> = {
  imageUrl: 'image',
  bannerImage: 'banner image',
  thumbnail: 'thumbnail',
  heroImage: 'hero image',
  ogImage: 'OG image',
};

export const serviceService = {
  // Resolve a slug that does not collide with any existing service (including
  // soft-deleted rows, because the DB unique index covers them). Appends a
  // numeric suffix (-2, -3, ...) until a free slug is found.
  async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    const clean = baseSlug || 'service';
    let candidate = clean;
    let suffix = 2;
    for (;;) {
      const existing = await serviceRepository.findBySlug(candidate);
      if (!existing || (excludeId && existing.id === excludeId)) return candidate;
      candidate = `${clean}-${suffix}`;
      suffix += 1;
    }
  },

  async create(input: CreateServiceInput, actorUserId?: string) {
    const category = await categoryRepository.findById(input.categoryId);
    if (!category) throw new ValidationError('categoryId does not reference an existing category');

    const duplicate = await serviceRepository.findByName(input.name);
    if (duplicate) throw new ConflictError(`A service named "${duplicate.name}" already exists`);

    const slug = await this.ensureUniqueSlug(input.slug ?? slugify(input.name));
    const service = await serviceRepository.create({ ...input, slug });

    await timelineService.recordEvent({
      entityType: 'SERVICE',
      entityId: service.id,
      eventType: 'SERVICE_CREATED',
      description: `Service "${service.name}" added to the catalog`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SERVICE',
      entityId: service.id,
      action: 'CREATE',
      afterState: { service },
      actorUserId,
    });

    return service;
  },

  async update(id: string, input: UpdateServiceInput, actorUserId?: string) {
    const existing = await serviceRepository.findById(id);
    if (!existing) throw new NotFoundError('Service not found');

    if (existing.deletedAt) {
      throw new ValidationError('Deleted services cannot be edited - restore the service first');
    }

    if (input.categoryId && input.categoryId !== existing.categoryId) {
      const category = await categoryRepository.findById(input.categoryId);
      if (!category) throw new ValidationError('categoryId does not reference an existing category');
    }

    if (input.name) {
      const duplicate = await serviceRepository.findByName(input.name, id);
      if (duplicate) throw new ConflictError(`A service named "${duplicate.name}" already exists`);
    }

    if (input.isActive && existing.archivedAt) {
      throw new ValidationError('Archived services cannot be activated - restore the service first');
    }

    // The slug is a stable URL segment: it only changes when the admin
    // explicitly supplies one. Renaming a service never silently breaks its
    // public URL or SEO.
    const data = input.slug ? { ...input, slug: await this.ensureUniqueSlug(input.slug, id) } : input;

    const updated = await serviceRepository.update(id, data);

    await timelineService.recordEvent({
      entityType: 'SERVICE',
      entityId: id,
      eventType: 'SERVICE_UPDATED',
      description: `Service "${existing.name}" was updated`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SERVICE',
      entityId: id,
      action: 'UPDATE',
      beforeState: { service: existing },
      afterState: { service: updated },
      actorUserId,
    });

    return updated;
  },

  async disable(id: string, actorUserId?: string) {
    const existing = await serviceRepository.findById(id);
    if (!existing) throw new NotFoundError('Service not found');

    const updated = await serviceRepository.disable(id);

    await timelineService.recordEvent({
      entityType: 'SERVICE',
      entityId: id,
      eventType: 'SERVICE_DISABLED',
      description: `Service "${existing.name}" was disabled`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SERVICE',
      entityId: id,
      action: 'DISABLE',
      beforeState: { isActive: existing.isActive },
      afterState: { isActive: false },
      actorUserId,
    });

    return updated;
  },

  // Soft-archive: the service disappears from every selection list but stays
  // attached to historical Leads/Quotations/Projects/Invoices. Hard deletion
  // is intentionally not offered anywhere - a used service must never vanish
  // from records, and an unused one loses nothing by being archived.
  async archive(id: string, actorUserId?: string) {
    const existing = await serviceRepository.findById(id);
    if (!existing) throw new NotFoundError('Service not found');
    if (existing.archivedAt) throw new ValidationError('Service is already archived');

    const usage = await serviceRepository.usageCounts(id);
    const updated = await serviceRepository.archive(id);

    await timelineService.recordEvent({
      entityType: 'SERVICE',
      entityId: id,
      eventType: 'SERVICE_ARCHIVED',
      description: `Service "${existing.name}" was archived`,
      actorUserId,
      metadata: { usage },
    });

    await auditService.recordAudit({
      entityType: 'SERVICE',
      entityId: id,
      action: 'ARCHIVE',
      beforeState: { isActive: existing.isActive, archivedAt: existing.archivedAt },
      afterState: { isActive: false, archivedAt: updated.archivedAt },
      actorUserId,
    });

    return updated;
  },

  async restore(id: string, actorUserId?: string) {
    const existing = await serviceRepository.findById(id);
    if (!existing) throw new NotFoundError('Service not found');
    if (!existing.archivedAt) throw new ValidationError('Service is not archived');

    const updated = await serviceRepository.restore(id);

    await timelineService.recordEvent({
      entityType: 'SERVICE',
      entityId: id,
      eventType: 'SERVICE_RESTORED',
      description: `Service "${existing.name}" was restored to the catalog`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SERVICE',
      entityId: id,
      action: 'RESTORE',
      beforeState: { isActive: existing.isActive, archivedAt: existing.archivedAt },
      afterState: { isActive: true, archivedAt: null },
      actorUserId,
    });

    return updated;
  },

  // Soft delete: the service vanishes from the public website and the default
  // admin list, but stays on every historical record. Always reversible.
  async softDelete(id: string, actorUserId?: string) {
    const existing = await serviceRepository.findById(id);
    if (!existing) throw new NotFoundError('Service not found');
    if (existing.deletedAt) throw new ValidationError('Service is already deleted');

    const usage = await serviceRepository.usageCounts(id);
    const updated = await serviceRepository.softDelete(id);

    await timelineService.recordEvent({
      entityType: 'SERVICE',
      entityId: id,
      eventType: 'SERVICE_DELETED',
      description: `Service "${existing.name}" was soft-deleted`,
      actorUserId,
      metadata: { usage },
    });

    await auditService.recordAudit({
      entityType: 'SERVICE',
      entityId: id,
      action: 'DELETE',
      beforeState: { isActive: existing.isActive, deletedAt: existing.deletedAt },
      afterState: { isActive: false, deletedAt: updated.deletedAt },
      actorUserId,
    });

    return updated;
  },

  async undelete(id: string, actorUserId?: string) {
    const existing = await serviceRepository.findById(id);
    if (!existing) throw new NotFoundError('Service not found');
    if (!existing.deletedAt) throw new ValidationError('Service is not deleted');

    const updated = await serviceRepository.undelete(id);

    await timelineService.recordEvent({
      entityType: 'SERVICE',
      entityId: id,
      eventType: 'SERVICE_RESTORED',
      description: `Service "${existing.name}" was restored after being deleted`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SERVICE',
      entityId: id,
      action: 'RESTORE',
      beforeState: { isActive: existing.isActive, deletedAt: existing.deletedAt },
      afterState: { deletedAt: null },
      actorUserId,
    });

    return updated;
  },

  // Duplicates every content field into a new draft (name + " (Copy)") so the
  // admin gets a ready-to-edit starting point. Never duplicates usage - the
  // copy starts clean.
  async duplicate(id: string, actorUserId?: string) {
    const existing = await serviceRepository.findById(id);
    if (!existing) throw new NotFoundError('Service not found');

    const name = `${existing.name} (Copy)`;
    const input: CreateServiceInput = {
      categoryId: existing.categoryId,
      name,
      slug: await this.ensureUniqueSlug(slugify(name)),
      description: existing.description ?? undefined,
      shortDescription: existing.shortDescription ?? undefined,
      icon: existing.icon ?? undefined,
      imageUrl: existing.imageUrl ?? undefined,
      bannerImage: existing.bannerImage ?? undefined,
      thumbnail: existing.thumbnail ?? undefined,
      heroImage: existing.heroImage ?? undefined,
      basePrice: existing.basePrice != null ? Number(existing.basePrice) : undefined,
      estimatedDuration: existing.estimatedDuration ?? undefined,
      requiresSiteVisit: existing.requiresSiteVisit,
      isFeatured: existing.isFeatured,
      isPopular: existing.isPopular,
      sortOrder: existing.sortOrder,
      seoTitle: existing.seoTitle ?? undefined,
      metaDescription: existing.metaDescription ?? undefined,
      metaKeywords: existing.metaKeywords ?? undefined,
      ogImage: existing.ogImage ?? undefined,
      canonicalUrl: existing.canonicalUrl ?? undefined,
    };

    const service = await serviceRepository.create(input);

    await timelineService.recordEvent({
      entityType: 'SERVICE',
      entityId: service.id,
      eventType: 'SERVICE_CREATED',
      description: `Service "${service.name}" duplicated from "${existing.name}"`,
      actorUserId,
      metadata: { sourceId: id },
    });

    await auditService.recordAudit({
      entityType: 'SERVICE',
      entityId: service.id,
      action: 'CREATE',
      afterState: { service, sourceId: id },
      actorUserId,
    });

    return service;
  },

  async getById(id: string, actorUser?: { id: string; type: string } | undefined) {
    const service = await serviceRepository.findById(id);
    if (!service) throw new NotFoundError('Service not found');

    // Soft-deleted services are only reachable by authenticated admins (for
    // the restore/undelete flow); anonymous/public callers get a 404.
    if (service.deletedAt && actorUser?.type !== 'ADMIN') {
      throw new NotFoundError('Service not found');
    }

    const usage = await serviceRepository.usageCounts(id);
    return { ...service, usage };
  },

  async list(pagination: PaginationParams, onlyActive: boolean, filters: ServiceListFilters = {}) {
    const { items, total } = await serviceRepository.list(pagination, onlyActive, filters);
    return { items, total };
  },

  async getQuestionnaire(serviceId: string) {
    const questionnaire = await serviceRepository.getActiveQuestionnaire(serviceId);
    if (!questionnaire) throw new NotFoundError('No active questionnaire for this service');
    return questionnaire;
  },

  async updateImage(
    id: string,
    imageUrl: string | null,
    field: ServiceImageField = 'imageUrl',
    actorUserId?: string,
  ) {
    const existing = await serviceRepository.findById(id);
    if (!existing) throw new NotFoundError('Service not found');

    // null clears the field (Prisma treats null as "set NULL"); undefined would
    // be ignored entirely, silently leaving a stale image behind.
    const updated = await serviceRepository.update(id, { [field]: imageUrl } as any);

    const label = IMAGE_FIELD_LABELS[field];
    await timelineService.recordEvent({
      entityType: 'SERVICE',
      entityId: id,
      eventType: 'SERVICE_UPDATED',
      description: imageUrl
        ? `Service "${existing.name}" ${label} was updated`
        : `Service "${existing.name}" ${label} was removed`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SERVICE',
      entityId: id,
      action: 'UPDATE',
      beforeState: { [field]: (existing as any)[field] },
      afterState: { [field]: imageUrl },
      actorUserId,
    });

    return updated;
  },
};
