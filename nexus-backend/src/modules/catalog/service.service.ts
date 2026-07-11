import { serviceRepository } from './service.repository';
import { categoryRepository } from './category.repository';
import { CreateServiceInput, UpdateServiceInput } from './catalog.types';
import { PaginationParams } from '../../core/utils/pagination';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';
import { timelineService } from '../timeline/timeline.service';

export const serviceService = {
  async create(input: CreateServiceInput, actorUserId?: string) {
    const category = await categoryRepository.findById(input.categoryId);
    if (!category) throw new ValidationError('categoryId does not reference an existing category');

    const service = await serviceRepository.create(input);

    await timelineService.recordEvent({
      entityType: 'SERVICE',
      entityId: service.id,
      eventType: 'SERVICE_CREATED',
      description: `Service "${service.name}" added to the catalog`,
      actorUserId,
    });

    return service;
  },

  async update(id: string, input: UpdateServiceInput, actorUserId?: string) {
    const existing = await serviceRepository.findById(id);
    if (!existing) throw new NotFoundError('Service not found');

    const updated = await serviceRepository.update(id, input);

    await timelineService.recordEvent({
      entityType: 'SERVICE',
      entityId: id,
      eventType: 'SERVICE_UPDATED',
      description: `Service "${existing.name}" was updated`,
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

    return updated;
  },

  async getById(id: string) {
    const service = await serviceRepository.findById(id);
    if (!service) throw new NotFoundError('Service not found');
    return service;
  },

  async list(pagination: PaginationParams, onlyActive: boolean) {
    const { items, total } = await serviceRepository.list(pagination, onlyActive);
    return { items, total };
  },

  async getQuestionnaire(serviceId: string) {
    const questionnaire = await serviceRepository.getActiveQuestionnaire(serviceId);
    if (!questionnaire) throw new NotFoundError('No active questionnaire for this service');
    return questionnaire;
  },
};
