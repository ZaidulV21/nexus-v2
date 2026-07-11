export type DocumentEntityType = 'LEAD' | 'PROJECT';

export const DOCUMENT_TYPES = [
  'DRAWING',
  'IMAGE',
  'REQUIREMENT_PDF',
  'CONTRACT',
  'QUOTATION',
  'SITE_PHOTO',
  'COMPLETION_REPORT',
  'WARRANTY',
  'OTHER',
] as const;

export interface UploadDocumentInput {
  entityType: DocumentEntityType;
  entityId: string;
  documentType: (typeof DOCUMENT_TYPES)[number];
  fileName: string;
  buffer: Buffer;
  mimeType: string;
}
