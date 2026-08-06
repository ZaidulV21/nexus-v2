import { subServiceRepository } from './subService.repository';
import { serviceRepository } from './service.repository';
import { CreateSubServiceInput, UpdateSubServiceInput, SubServiceListFilters } from './catalog.types';
import { PaginationParams } from '../../core/utils/pagination';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors/AppError';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';
import { slugify } from './service.service';

// Every image slot the CMS can manage on a sub-service. `gallery` is a
// multi-image JSON array (uploads append, removals filter by URL).
export const SUB_SERVICE_IMAGE_FIELDS = ['heroImage', 'ogImage', 'gallery'] as const;
export type SubServiceImageField = (typeof SUB_SERVICE_IMAGE_FIELDS)[number];

const IMAGE_FIELD_LABELS: Record<SubServiceImageField, string> = {
  heroImage: 'hero image',
  ogImage: 'OG image',
  gallery: 'gallery',
};

export const subServiceService = {
  // The sub-service routes live under /services/:ref/sub-services where :ref is
  // a service UUID (admin) or its public slug (public site). Resolve both.
  async resolveService(ref: string) {
    return (await serviceRepository.findById(ref)) ?? (await serviceRepository.findBySlug(ref));
  },

  // Resolve a slug that does not collide with any other sub-service under the
  // same service (including soft-deleted rows). Appends -2, -3, ... like the
  // service-level ensureUniqueSlug().
  async ensureUniqueSlug(serviceId: string, baseSlug: string, excludeId?: string): Promise<string> {
    const clean = baseSlug || 'service';
    let candidate = clean;
    let suffix = 2;
    for (;;) {
      const existing = await subServiceRepository.findByServiceAndSlug(serviceId, candidate);
      if (!existing || (excludeId && existing.id === excludeId)) return candidate;
      candidate = `${clean}-${suffix}`;
      suffix += 1;
    }
  },

  async create(serviceRef: string, input: CreateSubServiceInput, actorUserId?: string) {
    const service = await this.resolveService(serviceRef);
    if (!service) throw new NotFoundError('Service not found');
    if (service.deletedAt) throw new ValidationError('Deleted services cannot have sub-services added');

    const duplicate = await subServiceRepository.findByName(service.id, input.name);
    if (duplicate) throw new ConflictError(`A sub-service named "${duplicate.name}" already exists under this service`);

    const slug = await this.ensureUniqueSlug(service.id, input.slug ?? slugify(input.name));
    const subService = await subServiceRepository.create(service.id, { ...input, slug });

    await timelineService.recordEvent({
      entityType: 'SUB_SERVICE',
      entityId: subService.id,
      eventType: 'SUB_SERVICE_CREATED',
      description: `Sub-service "${subService.name}" added under "${service.name}"`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SUB_SERVICE',
      entityId: subService.id,
      action: 'CREATE',
      afterState: { subService, serviceId: service.id },
      actorUserId,
    });

    return subService;
  },

  async update(id: string, input: UpdateSubServiceInput, actorUserId?: string) {
    const existing = await subServiceRepository.findById(id);
    if (!existing) throw new NotFoundError('Sub-service not found');
    if (existing.deletedAt) {
      throw new ValidationError('Deleted sub-services cannot be edited - restore the sub-service first');
    }

    if (input.name) {
      const duplicate = await subServiceRepository.findByName(existing.serviceId, input.name, id);
      if (duplicate) throw new ConflictError(`A sub-service named "${duplicate.name}" already exists under this service`);
    }

    if (input.isActive && existing.archivedAt) {
      throw new ValidationError('Archived sub-services cannot be activated - restore the sub-service first');
    }

    // The slug only changes when the admin explicitly supplies one, so public
    // sub-service URLs stay stable on rename.
    const data = input.slug
      ? { ...input, slug: await this.ensureUniqueSlug(existing.serviceId, input.slug, id) }
      : input;

    const updated = await subServiceRepository.update(id, data);

    await timelineService.recordEvent({
      entityType: 'SUB_SERVICE',
      entityId: id,
      eventType: 'SUB_SERVICE_UPDATED',
      description: `Sub-service "${existing.name}" was updated`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SUB_SERVICE',
      entityId: id,
      action: 'UPDATE',
      beforeState: { subService: existing },
      afterState: { subService: updated },
      actorUserId,
    });

    return updated;
  },

  async disable(id: string, actorUserId?: string) {
    const existing = await subServiceRepository.findById(id);
    if (!existing) throw new NotFoundError('Sub-service not found');

    const updated = await subServiceRepository.disable(id);

    await timelineService.recordEvent({
      entityType: 'SUB_SERVICE',
      entityId: id,
      eventType: 'SUB_SERVICE_DISABLED',
      description: `Sub-service "${existing.name}" was disabled`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SUB_SERVICE',
      entityId: id,
      action: 'DISABLE',
      beforeState: { isActive: existing.isActive },
      afterState: { isActive: false },
      actorUserId,
    });

    return updated;
  },

  async archive(id: string, actorUserId?: string) {
    const existing = await subServiceRepository.findById(id);
    if (!existing) throw new NotFoundError('Sub-service not found');
    if (existing.archivedAt) throw new ValidationError('Sub-service is already archived');

    const updated = await subServiceRepository.archive(id);

    await timelineService.recordEvent({
      entityType: 'SUB_SERVICE',
      entityId: id,
      eventType: 'SUB_SERVICE_ARCHIVED',
      description: `Sub-service "${existing.name}" was archived`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SUB_SERVICE',
      entityId: id,
      action: 'ARCHIVE',
      beforeState: { isActive: existing.isActive, archivedAt: existing.archivedAt },
      afterState: { isActive: false, archivedAt: updated.archivedAt },
      actorUserId,
    });

    return updated;
  },

  async restore(id: string, actorUserId?: string) {
    const existing = await subServiceRepository.findById(id);
    if (!existing) throw new NotFoundError('Sub-service not found');
    if (!existing.archivedAt) throw new ValidationError('Sub-service is not archived');

    const updated = await subServiceRepository.restore(id);

    await timelineService.recordEvent({
      entityType: 'SUB_SERVICE',
      entityId: id,
      eventType: 'SUB_SERVICE_RESTORED',
      description: `Sub-service "${existing.name}" was restored to the catalog`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SUB_SERVICE',
      entityId: id,
      action: 'RESTORE',
      beforeState: { isActive: existing.isActive, archivedAt: existing.archivedAt },
      afterState: { isActive: true, archivedAt: null },
      actorUserId,
    });

    return updated;
  },

  async softDelete(id: string, actorUserId?: string) {
    const existing = await subServiceRepository.findById(id);
    if (!existing) throw new NotFoundError('Sub-service not found');
    if (existing.deletedAt) throw new ValidationError('Sub-service is already deleted');

    const updated = await subServiceRepository.softDelete(id);

    await timelineService.recordEvent({
      entityType: 'SUB_SERVICE',
      entityId: id,
      eventType: 'SUB_SERVICE_DELETED',
      description: `Sub-service "${existing.name}" was soft-deleted`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SUB_SERVICE',
      entityId: id,
      action: 'DELETE',
      beforeState: { isActive: existing.isActive, deletedAt: existing.deletedAt },
      afterState: { isActive: false, deletedAt: updated.deletedAt },
      actorUserId,
    });

    return updated;
  },

  async undelete(id: string, actorUserId?: string) {
    const existing = await subServiceRepository.findById(id);
    if (!existing) throw new NotFoundError('Sub-service not found');
    if (!existing.deletedAt) throw new ValidationError('Sub-service is not deleted');

    const updated = await subServiceRepository.undelete(id);

    await timelineService.recordEvent({
      entityType: 'SUB_SERVICE',
      entityId: id,
      eventType: 'SUB_SERVICE_RESTORED',
      description: `Sub-service "${existing.name}" was restored after being deleted`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SUB_SERVICE',
      entityId: id,
      action: 'RESTORE',
      beforeState: { isActive: existing.isActive, deletedAt: existing.deletedAt },
      afterState: { deletedAt: null },
      actorUserId,
    });

    return updated;
  },

  // Duplicates every content field into a new draft (name + " (Copy)") so the
  // admin gets a ready-to-edit starting point.
  async duplicate(id: string, actorUserId?: string) {
    const existing = await subServiceRepository.findById(id);
    if (!existing) throw new NotFoundError('Sub-service not found');

    const name = `${existing.name} (Copy)`;
    const input: CreateSubServiceInput = {
      name,
      slug: await this.ensureUniqueSlug(existing.serviceId, slugify(name)),
      shortDescription: existing.shortDescription ?? undefined,
      description: existing.description ?? undefined,
      icon: existing.icon ?? undefined,
      heroImage: existing.heroImage ?? undefined,
      gallery: (existing.gallery as string[]) ?? undefined,
      features: (existing.features as string[]) ?? undefined,
      whatsIncluded: (existing.whatsIncluded as string[]) ?? undefined,
      process: (existing.process as unknown as CreateSubServiceInput['process']) ?? undefined,
      faqs: (existing.faqs as unknown as CreateSubServiceInput['faqs']) ?? undefined,
      startingPrice: existing.startingPrice ?? undefined,
      completionTime: existing.completionTime ?? undefined,
      sortOrder: existing.sortOrder,
      seoTitle: existing.seoTitle ?? undefined,
      metaDescription: existing.metaDescription ?? undefined,
      metaKeywords: existing.metaKeywords ?? undefined,
      ogImage: existing.ogImage ?? undefined,
      canonicalUrl: existing.canonicalUrl ?? undefined,
    };

    const subService = await subServiceRepository.create(existing.serviceId, input);

    await timelineService.recordEvent({
      entityType: 'SUB_SERVICE',
      entityId: subService.id,
      eventType: 'SUB_SERVICE_CREATED',
      description: `Sub-service "${subService.name}" duplicated from "${existing.name}"`,
      actorUserId,
      metadata: { sourceId: id },
    });

    await auditService.recordAudit({
      entityType: 'SUB_SERVICE',
      entityId: subService.id,
      action: 'CREATE',
      afterState: { subService, sourceId: id },
      actorUserId,
    });

    return subService;
  },

  async getById(id: string, actorUser?: { id: string; type: string } | undefined) {
    const subService = await subServiceRepository.findById(id);
    if (!subService) throw new NotFoundError('Sub-service not found');

    // Soft-deleted rows are only reachable by authenticated admins (restore
    // flow); anonymous/public callers get a 404.
    if (subService.deletedAt && actorUser?.type !== 'ADMIN') {
      throw new NotFoundError('Sub-service not found');
    }

    return subService;
  },

  async listByService(
    serviceRef: string,
    pagination: PaginationParams,
    onlyActive: boolean,
    filters: SubServiceListFilters = {},
  ) {
    const service = await this.resolveService(serviceRef);
    if (!service) throw new NotFoundError('Service not found');

    const { items, total } = await subServiceRepository.listByService(service.id, onlyActive, filters, {
      skip: pagination.skip,
      take: pagination.take,
    });
    return { items, total };
  },

  async reorder(serviceRef: string, orderedIds: string[], actorUserId?: string) {
    const service = await this.resolveService(serviceRef);
    if (!service) throw new NotFoundError('Service not found');

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new ValidationError('orderedIds must be a non-empty array');
    }

    const existing = await subServiceRepository.listByService(service.id, false, { status: 'ALL' }, { take: 10000 });
    const existingIds = new Set(existing.items.map((s) => s.id));
    const duplicates = new Set(orderedIds);
    if (duplicates.size !== orderedIds.length) {
      throw new ValidationError('orderedIds contains duplicate ids');
    }
    const unknown = orderedIds.find((id) => !existingIds.has(id));
    if (unknown) throw new ValidationError(`Sub-service "${unknown}" does not belong to this service`);

    await subServiceRepository.reorder(orderedIds);

    await timelineService.recordEvent({
      entityType: 'SUB_SERVICE',
      entityId: service.id,
      eventType: 'SUB_SERVICE_REORDERED',
      description: `Sub-services under "${service.name}" were reordered`,
      actorUserId,
    });

    return { orderedIds };
  },

  async updateImage(
    id: string,
    imageUrl: string | null,
    field: SubServiceImageField = 'heroImage',
    actorUserId?: string,
  ) {
    const existing = await subServiceRepository.findById(id);
    if (!existing) throw new NotFoundError('Sub-service not found');

    // The gallery is a JSON array: an upload appends the URL.
    if (field === 'gallery') {
      if (!imageUrl) throw new ValidationError('A gallery image URL is required');
      const gallery = Array.isArray(existing.gallery) ? (existing.gallery as string[]) : [];
      const updated = await subServiceRepository.update(id, { gallery: [...gallery, imageUrl] });

      await timelineService.recordEvent({
        entityType: 'SUB_SERVICE',
        entityId: id,
        eventType: 'SUB_SERVICE_UPDATED',
        description: `A gallery image was added to "${existing.name}"`,
        actorUserId,
      });

      await auditService.recordAudit({
        entityType: 'SUB_SERVICE',
        entityId: id,
        action: 'UPDATE',
        beforeState: { gallery },
        afterState: { gallery: updated.gallery },
        actorUserId,
      });

      return updated;
    }

    // null clears the field (Prisma treats null as "set NULL"); undefined would
    // be ignored entirely, silently leaving a stale image behind.
    const updated = await subServiceRepository.update(id, { [field]: imageUrl } as any);

    const label = IMAGE_FIELD_LABELS[field];
    await timelineService.recordEvent({
      entityType: 'SUB_SERVICE',
      entityId: id,
      eventType: 'SUB_SERVICE_UPDATED',
      description: imageUrl
        ? `Sub-service "${existing.name}" ${label} was updated`
        : `Sub-service "${existing.name}" ${label} was removed`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SUB_SERVICE',
      entityId: id,
      action: 'UPDATE',
      beforeState: { [field]: (existing as any)[field] },
      afterState: { [field]: imageUrl },
      actorUserId,
    });

    return updated;
  },

  // Removes a single URL from the gallery JSON array.
  async removeGalleryImage(id: string, url: string, actorUserId?: string) {
    const existing = await subServiceRepository.findById(id);
    if (!existing) throw new NotFoundError('Sub-service not found');
    if (!url) throw new ValidationError('A gallery image URL is required');

    const gallery = Array.isArray(existing.gallery) ? (existing.gallery as string[]) : [];
    const updated = await subServiceRepository.update(id, { gallery: gallery.filter((u) => u !== url) });

    await timelineService.recordEvent({
      entityType: 'SUB_SERVICE',
      entityId: id,
      eventType: 'SUB_SERVICE_UPDATED',
      description: `A gallery image was removed from "${existing.name}"`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SUB_SERVICE',
      entityId: id,
      action: 'UPDATE',
      beforeState: { gallery },
      afterState: { gallery: updated.gallery },
      actorUserId,
    });

    return updated;
  },
};
