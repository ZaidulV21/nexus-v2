import { api } from '@/lib/api';
import type { NexusDocument } from '@/types';

export interface DocumentListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  documentType?: string;
  entityType?: string;
}

export interface UploadDocumentInput {
  entityType: 'LEAD' | 'PROJECT';
  entityId: string;
  documentType: string;
  file: File;
}

export const documentService = {
  /** Client-portal: every document attached to the authenticated client's records. */
  listMine: () => api.get<NexusDocument[]>('/documents/me'),

  /** Admin: paginated listing across all leads and projects. */
  listAll: (params: DocumentListParams) =>
    api.getPaginated<NexusDocument>('/documents/all', {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      documentType: params.documentType,
      entityType: params.entityType,
    }),

  listForEntity: (entityType: 'LEAD' | 'PROJECT', entityId: string) =>
    api.get<NexusDocument[]>('/documents', { entityType, entityId }),

  upload: (input: UploadDocumentInput) => {
    const formData = new FormData();
    formData.append('entityType', input.entityType);
    formData.append('entityId', input.entityId);
    formData.append('documentType', input.documentType);
    formData.append('file', input.file);
    return api.upload<NexusDocument>('/documents', formData);
  },

  remove: (documentId: string) => api.delete<NexusDocument>(`/documents/${documentId}`),

  getDownload: (documentId: string) =>
    api.get<{ document: NexusDocument; url: string }>(`/documents/${documentId}/download`),
};
