import { z } from 'zod';
import { DOCUMENT_TYPES } from './documents.types';

export const uploadDocumentMetaSchema = z.object({
  entityType: z.enum(['LEAD', 'PROJECT']),
  entityId: z.string().uuid(),
  documentType: z.enum(DOCUMENT_TYPES),
});

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
