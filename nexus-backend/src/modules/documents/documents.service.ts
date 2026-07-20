import { documentsRepository } from './documents.repository';
import { localStorageProvider } from '../../core/storage/localStorage.provider';
import { cloudinaryProvider } from '../../core/storage/cloudinary.provider';
import { env } from '../../config/env';
import { UploadDocumentInput, DocumentEntityType } from './documents.types';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './documents.validation';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';
import { timelineService } from '../timeline/timeline.service';
import { notificationsService } from '../notifications/notifications.service';
import { leadRepository } from '../lead/lead.repository';
import { projectRepository } from '../project/project.repository';

const storageProvider = env.cloudinaryCloudName ? cloudinaryProvider : localStorageProvider;

export const documentsService = {
  async upload(input: UploadDocumentInput, uploadedByUserId: string) {
    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw new ValidationError(`File type ${input.mimeType} is not allowed`);
    }
    if (input.buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError('File exceeds the maximum allowed size of 15MB');
    }

    let clientId: string | undefined;
    let projectRefId: string | undefined;

    if (input.entityType === 'LEAD') {
      const lead = await leadRepository.findById(input.entityId);
      if (!lead) throw new NotFoundError('Lead not found');
    } else {
      const project = await projectRepository.findById(input.entityId);
      if (!project) throw new NotFoundError('Project not found');
      clientId = project.clientId;
      projectRefId = project.id;
    }

    const stored = await storageProvider.save(input.fileName, input.buffer, input.mimeType);

    const document = await documentsRepository.create({
      entityType: input.entityType,
      entityId: input.entityId,
      documentType: input.documentType,
      fileName: input.fileName,
      fileUrl: stored.fileUrl,
      fileSize: stored.fileSize,
      mimeType: input.mimeType,
      uploadedByUserId,
      clientId,
      projectRefId,
    });

    await timelineService.recordEvent({
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: 'DOCUMENT_UPLOADED',
      description: `Document "${input.fileName}" (${input.documentType}) uploaded`,
      actorUserId: uploadedByUserId,
    });

    await notificationsService.emitEvent({
      eventType: 'document.uploaded',
      entityType: 'DOCUMENT',
      entityId: document.id,
      recipient: 'admin-inbox',
      payload: { fileName: input.fileName, documentType: input.documentType, entityType: input.entityType, entityId: input.entityId, clientId },
    });

    return document;
  },

  async listForEntity(entityType: DocumentEntityType, entityId: string, actor?: { id: string; type: string }) {
    if (actor?.type === 'CLIENT') {
      // Clients may only list documents on a Project that belongs to them -
      // Lead-stage documents are pre-conversion and never client-visible.
      if (entityType !== 'PROJECT') return [];
      const project = await projectRepository.findById(entityId);
      if (!project || project.clientId !== actor.id) return [];
    }
    return documentsRepository.listForEntity(entityType, entityId);
  },

  async listForClient(clientId: string) {
    return documentsRepository.listForClient(clientId);
  },

  async listAll(params: {
    skip: number;
    take: number;
    search?: string;
    documentType?: string;
    entityType?: string;
  }) {
    return documentsRepository.listAll(params);
  },

  async getDownloadUrl(id: string, actor?: { id: string; type: string }) {
    const doc = await documentsRepository.findById(id);
    if (!doc) throw new NotFoundError('Document not found');
    if (actor?.type === 'CLIENT' && doc.clientId !== actor.id) {
      // Clients may only download documents attached to their own records.
      throw new NotFoundError('Document not found');
    }
    // Cloudinary URLs are already fully qualified HTTPS URLs and can be opened
    // directly. Local-storage fileUrls are bare filenames that need the
    // /uploads prefix to be served by express.static.
    const url = env.cloudinaryCloudName
      ? doc.fileUrl
      : `/uploads/${doc.fileUrl}`;
    return { document: doc, url };
  },

  async softDelete(id: string, actorUserId?: string) {
    const doc = await documentsRepository.findById(id);
    if (!doc) throw new NotFoundError('Document not found');
    const deleted = await documentsRepository.softDelete(id);

    await timelineService.recordEvent({
      entityType: doc.entityType,
      entityId: doc.entityId,
      eventType: 'DOCUMENT_DELETED',
      description: `Document "${doc.fileName}" removed`,
      actorUserId,
    });

    return deleted;
  },
};
