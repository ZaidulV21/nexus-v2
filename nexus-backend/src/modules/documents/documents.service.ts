import { documentsRepository } from './documents.repository';
import { localStorageProvider } from '../../core/storage/localStorage.provider';
import { s3StorageProvider } from '../../core/storage/s3Storage.provider';
import { env } from '../../config/env';
import { UploadDocumentInput, DocumentEntityType } from './documents.types';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './documents.validation';
import { NotFoundError, ValidationError } from '../../core/errors/AppError';
import { timelineService } from '../timeline/timeline.service';
import { leadRepository } from '../lead/lead.repository';
import { projectRepository } from '../project/project.repository';

const storageProvider = env.storageDriver === 's3' ? s3StorageProvider : localStorageProvider;

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

    return document;
  },

  async listForEntity(entityType: DocumentEntityType, entityId: string) {
    return documentsRepository.listForEntity(entityType, entityId);
  },

  async listForClient(clientId: string) {
    return documentsRepository.listForClient(clientId);
  },

  async getDownloadUrl(id: string) {
    const doc = await documentsRepository.findById(id);
    if (!doc) throw new NotFoundError('Document not found');
    return { document: doc, url: storageProvider.getUrl(doc.fileUrl) };
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
