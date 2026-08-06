import { projectMediaRepository } from './projectMedia.repository';
import { projectRepository } from './project.repository';
import { CreateProjectMediaInput, UpdateProjectMediaInput } from './project.types';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';
import { timelineService } from '../timeline/timeline.service';
import { auditService } from '../audit/audit.service';

export const PROJECT_MEDIA_ENTITY_TYPE = 'PROJECT_MEDIA';

export const projectMediaService = {
  // Guard shared by every mutation: the parent project must exist, not be
  // soft-deleted, and be Completed. Completion media only ever attach to
  // finished projects - that is exactly what "portfolio grows automatically"
  // relies on.
  async getProjectForMutation(projectId: string) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    if (project.deletedAt) throw new ValidationError('Deleted projects cannot have completion media');
    if (!project.completedAt) {
      throw new ValidationError('Completion media can only be added after the project is marked complete');
    }
    return project;
  },

  async create(projectId: string, input: CreateProjectMediaInput, actorUserId?: string) {
    const project = await this.getProjectForMutation(projectId);

    const media = await projectMediaRepository.create(project.id, input);

    await timelineService.recordEvent({
      entityType: PROJECT_MEDIA_ENTITY_TYPE,
      entityId: media.id,
      eventType: 'PROJECT_MEDIA_ADDED',
      description: `A ${input.type.toLowerCase()} was added to Project ${project.projectNumber} portfolio`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: PROJECT_MEDIA_ENTITY_TYPE,
      entityId: media.id,
      action: 'CREATE',
      afterState: { media, projectId: project.id },
      actorUserId,
    });

    // Feature a fresh upload immediately when the project has no highlight
    // yet, so the admin never has to fight an existing cover.
    if (input.isFeatured) {
      const siblings = await projectMediaRepository.listByProject(project.id, false);
      if (siblings.some((item) => item.isFeatured && item.id !== media.id)) {
        await projectMediaRepository.setFeatured(project.id, media.id);
      }
    }

    return media;
  },

  async update(id: string, input: UpdateProjectMediaInput, actorUserId?: string) {
    const existing = await projectMediaRepository.findById(id);
    if (!existing) throw new NotFoundError('Project media not found');

    const updated = await projectMediaRepository.update(id, input);

    await timelineService.recordEvent({
      entityType: PROJECT_MEDIA_ENTITY_TYPE,
      entityId: id,
      eventType: 'PROJECT_MEDIA_UPDATED',
      description: 'A project portfolio item was updated',
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: PROJECT_MEDIA_ENTITY_TYPE,
      entityId: id,
      action: 'UPDATE',
      beforeState: { media: existing },
      afterState: { media: updated },
      actorUserId,
    });

    return updated;
  },

  async setFeatured(projectId: string, mediaId: string, actorUserId?: string) {
    const project = await this.getProjectForMutation(projectId);
    const media = await projectMediaRepository.findById(mediaId);
    if (!media) throw new NotFoundError('Project media not found');
    if (media.projectId !== project.id) {
      throw new ValidationError('This project media item does not belong to this project');
    }

    await projectMediaRepository.setFeatured(project.id, mediaId);

    await timelineService.recordEvent({
      entityType: PROJECT_MEDIA_ENTITY_TYPE,
      entityId: mediaId,
      eventType: 'PROJECT_MEDIA_UPDATED',
      description: `Project ${project.projectNumber} portfolio now features ${media.type === 'DOCUMENT' ? 'a document' : media.type === 'VIDEO' ? 'a video' : 'an image'}`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: PROJECT_MEDIA_ENTITY_TYPE,
      entityId: mediaId,
      action: 'UPDATE',
      beforeState: { isFeatured: media.isFeatured },
      afterState: { isFeatured: true },
      actorUserId,
    });

    return projectMediaRepository.findById(mediaId);
  },

  async toggleActive(id: string, actorUserId?: string) {
    const existing = await projectMediaRepository.findById(id);
    if (!existing) throw new NotFoundError('Project media not found');

    const updated = await projectMediaRepository.setActive(id, !existing.isActive);

    await timelineService.recordEvent({
      entityType: PROJECT_MEDIA_ENTITY_TYPE,
      entityId: id,
      eventType: 'PROJECT_MEDIA_UPDATED',
      description: updated.isActive
        ? 'A project portfolio item is visible on the public site again'
        : 'A project portfolio item was hidden from the public site',
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: PROJECT_MEDIA_ENTITY_TYPE,
      entityId: id,
      action: 'UPDATE',
      beforeState: { isActive: existing.isActive },
      afterState: { isActive: updated.isActive },
      actorUserId,
    });

    return updated;
  },

  async remove(id: string, actorUserId?: string) {
    const existing = await projectMediaRepository.findById(id);
    if (!existing) throw new NotFoundError('Project media not found');

    await projectMediaRepository.hardDelete(id);

    await timelineService.recordEvent({
      entityType: PROJECT_MEDIA_ENTITY_TYPE,
      entityId: id,
      eventType: 'PROJECT_MEDIA_REMOVED',
      description: `A ${existing.type.toLowerCase()} was removed from the project portfolio`,
      actorUserId,
    });

    await auditService.recordAudit({
      entityType: PROJECT_MEDIA_ENTITY_TYPE,
      entityId: id,
      action: 'DELETE',
      beforeState: { media: existing },
      actorUserId,
    });

    return { id, removed: true };
  },

  async listByProject(projectId: string, onlyActive: boolean) {
    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError('Project not found');
    return projectMediaRepository.listByProject(project.id, onlyActive);
  },

  async reorder(projectId: string, orderedIds: string[], actorUserId?: string) {
    const project = await this.getProjectForMutation(projectId);

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new ValidationError('orderedIds must be a non-empty array');
    }

    const existing = await projectMediaRepository.listByProject(project.id, false);
    const existingIds = new Set(existing.map((m) => m.id));
    const duplicates = new Set(orderedIds);
    if (duplicates.size !== orderedIds.length) {
      throw new ValidationError('orderedIds contains duplicate ids');
    }
    const unknown = orderedIds.find((id) => !existingIds.has(id));
    if (unknown) throw new ValidationError(`Project media item "${unknown}" does not belong to this project`);

    await projectMediaRepository.reorder(orderedIds);

    await timelineService.recordEvent({
      entityType: PROJECT_MEDIA_ENTITY_TYPE,
      entityId: project.id,
      eventType: 'PROJECT_MEDIA_REORDERED',
      description: `Project ${project.projectNumber} portfolio was reordered`,
      actorUserId,
    });

    return { orderedIds };
  },
};
