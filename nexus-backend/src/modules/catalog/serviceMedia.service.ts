import { serviceMediaRepository } from './serviceMedia.repository';
import { serviceRepository } from './service.repository';
import {
  CreateServiceMediaInput,
  ServiceMediaType,
  UpdateServiceMediaInput,
} from './catalog.types';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';

export const SERVICE_MEDIA_ENTITY_TYPE = 'SERVICE_MEDIA';

export const serviceMediaService = {
  // The gallery routes live under /services/:ref/media where :ref is a service
  // UUID (admin) or its public slug (public site). Resolve both, mirroring the
  // sub-service routes.
  async resolveService(ref: string) {
    return (await serviceRepository.findById(ref)) ?? (await serviceRepository.findBySlug(ref));
  },

  // Guard shared by every mutation: the parent service must exist and not be
  // soft-deleted (a deleted service's gallery is frozen).
  async getServiceForMutation(serviceRef: string) {
    const service = await this.resolveService(serviceRef);
    if (!service) throw new NotFoundError('Service not found');
    if (service.deletedAt) throw new ValidationError('Deleted services cannot have gallery items');
    return service;
  },

  async create(serviceRef: string, input: CreateServiceMediaInput, actorUserId?: string) {
    const service = await this.getServiceForMutation(serviceRef);

    const media = await serviceMediaRepository.create(service.id, input);

    await timelineService.recordEvent({
      entityType: SERVICE_MEDIA_ENTITY_TYPE,
      entityId: media.id,
      eventType: 'SERVICE_MEDIA_ADDED',
      description: `A ${input.type.toLowerCase()} was added to the "${service.name}" gallery`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: SERVICE_MEDIA_ENTITY_TYPE,
      entityId: media.id,
      action: 'CREATE',
      afterState: { media, serviceId: service.id },
      actorUserId,
    });

    // Feature a fresh upload immediately only when the gallery is otherwise
    // empty, so the admin never has to fight an existing highlight.
    if (input.isFeatured) {
      const siblings = await serviceMediaRepository.listByService(service.id, false);
      if (siblings.some((item) => item.isFeatured && item.id !== media.id)) {
        await serviceMediaRepository.setFeatured(service.id, media.id);
      }
    }

    return media;
  },

  async update(id: string, input: UpdateServiceMediaInput, actorUserId?: string) {
    const existing = await serviceMediaRepository.findById(id);
    if (!existing) throw new NotFoundError('Gallery item not found');

    const updated = await serviceMediaRepository.update(id, input);

    await timelineService.recordEvent({
      entityType: SERVICE_MEDIA_ENTITY_TYPE,
      entityId: id,
      eventType: 'SERVICE_MEDIA_UPDATED',
      description: `A gallery item was updated`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: SERVICE_MEDIA_ENTITY_TYPE,
      entityId: id,
      action: 'UPDATE',
      beforeState: { media: existing },
      afterState: { media: updated },
      actorUserId,
    });

    return updated;
  },

  async setFeatured(serviceRef: string, mediaId: string, actorUserId?: string) {
    const service = await this.getServiceForMutation(serviceRef);
    const media = await serviceMediaRepository.findById(mediaId);
    if (!media) throw new NotFoundError('Gallery item not found');
    if (media.serviceId !== service.id) {
      throw new ValidationError('This gallery item does not belong to this service');
    }

    await serviceMediaRepository.setFeatured(service.id, mediaId);

    await timelineService.recordEvent({
      entityType: SERVICE_MEDIA_ENTITY_TYPE,
      entityId: mediaId,
      eventType: 'SERVICE_MEDIA_UPDATED',
      description: `"${service.name}" gallery now features ${
        media.type === 'VIDEO' ? 'a video' : 'an image'
      }`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: SERVICE_MEDIA_ENTITY_TYPE,
      entityId: mediaId,
      action: 'UPDATE',
      beforeState: { isFeatured: media.isFeatured },
      afterState: { isFeatured: true },
      actorUserId,
    });

    return serviceMediaRepository.findById(mediaId);
  },

  async toggleActive(id: string, actorUserId?: string) {
    const existing = await serviceMediaRepository.findById(id);
    if (!existing) throw new NotFoundError('Gallery item not found');

    const updated = await serviceMediaRepository.setActive(id, !existing.isActive);

    await timelineService.recordEvent({
      entityType: SERVICE_MEDIA_ENTITY_TYPE,
      entityId: id,
      eventType: 'SERVICE_MEDIA_UPDATED',
      description: updated.isActive
        ? 'A gallery item is visible on the public site again'
        : 'A gallery item was hidden from the public site',
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: SERVICE_MEDIA_ENTITY_TYPE,
      entityId: id,
      action: 'UPDATE',
      beforeState: { isActive: existing.isActive },
      afterState: { isActive: updated.isActive },
      actorUserId,
    });

    return updated;
  },

  async remove(id: string, actorUserId?: string) {
    const existing = await serviceMediaRepository.findById(id);
    if (!existing) throw new NotFoundError('Gallery item not found');

    await serviceMediaRepository.hardDelete(id);

    await timelineService.recordEvent({
      entityType: SERVICE_MEDIA_ENTITY_TYPE,
      entityId: id,
      eventType: 'SERVICE_MEDIA_REMOVED',
      description: `A ${existing.type.toLowerCase()} was removed from the service gallery`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: SERVICE_MEDIA_ENTITY_TYPE,
      entityId: id,
      action: 'DELETE',
      beforeState: { media: existing },
      actorUserId,
    });

    return { id, removed: true };
  },

  async listByService(serviceRef: string, onlyActive: boolean) {
    const service = await this.resolveService(serviceRef);
    if (!service) throw new NotFoundError('Service not found');
    return serviceMediaRepository.listByService(service.id, onlyActive);
  },

  async reorder(serviceRef: string, orderedIds: string[], actorUserId?: string) {
    const service = await this.getServiceForMutation(serviceRef);

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new ValidationError('orderedIds must be a non-empty array');
    }

    const existing = await serviceMediaRepository.listByService(service.id, false);
    const existingIds = new Set(existing.map((m) => m.id));
    const duplicates = new Set(orderedIds);
    if (duplicates.size !== orderedIds.length) {
      throw new ValidationError('orderedIds contains duplicate ids');
    }
    const unknown = orderedIds.find((id) => !existingIds.has(id));
    if (unknown) throw new ValidationError(`Gallery item "${unknown}" does not belong to this service`);

    await serviceMediaRepository.reorder(orderedIds);

    await timelineService.recordEvent({
      entityType: SERVICE_MEDIA_ENTITY_TYPE,
      entityId: service.id,
      eventType: 'SERVICE_MEDIA_REORDERED',
      description: `The "${service.name}" gallery was reordered`,
      actorUserId,
    });

    return { orderedIds };
  },
};
