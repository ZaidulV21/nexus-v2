import { serviceRepository } from './service.repository';
import { categoryRepository } from './category.repository';
import { CreateServiceInput, UpdateServiceInput, ServiceListFilters } from './catalog.types';
import { PaginationParams } from '../../core/utils/pagination';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors/AppError';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';

export const serviceService = {
  async create(input: CreateServiceInput, actorUserId?: string) {
    const category = await categoryRepository.findById(input.categoryId);
    if (!category) throw new ValidationError('categoryId does not reference an existing category');

    const duplicate = await serviceRepository.findByName(input.name);
    if (duplicate) throw new ConflictError(`A service named "${duplicate.name}" already exists`);

    const service = await serviceRepository.create(input);

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

    const updated = await serviceRepository.update(id, input);

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

  async getById(id: string) {
    const service = await serviceRepository.findById(id);
    if (!service) throw new NotFoundError('Service not found');
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

  async updateImage(id: string, imageUrl: string | null, actorUserId?: string) {
    const existing = await serviceRepository.findById(id);
    if (!existing) throw new NotFoundError('Service not found');

    const updated = await serviceRepository.update(id, { imageUrl: imageUrl ?? undefined } as any);

    await timelineService.recordEvent({
      entityType: 'SERVICE',
      entityId: id,
      eventType: 'SERVICE_UPDATED',
      description: imageUrl
        ? `Service "${existing.name}" image was updated`
        : `Service "${existing.name}" image was removed`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: 'SERVICE',
      entityId: id,
      action: 'UPDATE',
      beforeState: { imageUrl: (existing as any).imageUrl },
      afterState: { imageUrl },
      actorUserId,
    });

    return updated;
  },
};
