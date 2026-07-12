import { api } from '@/lib/api';
import type { FinancialSummary, Invoice, NexusDocument, Project } from '@/types';

export interface ProjectListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateProjectServiceStatusInput {
  toStatus: string;
  reason?: string;
}

export const projectService = {
  list: (params: ProjectListParams) =>
    api.getPaginated<Project>('/projects', {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    }),

  getById: (id: string) => api.get<Project>(`/projects/${id}`),

  updateServiceStatus: (projectServiceId: string, input: UpdateProjectServiceStatusInput) =>
    api.patch<{ id: string; status: string }>(`/projects/services/${projectServiceId}/status`, input),

  complete: (projectId: string) => api.post<Project>(`/projects/${projectId}/complete`),

  listInvoices: (projectId: string) => api.get<Invoice[]>(`/invoices/project/${projectId}`),

  getFinancialSummary: (projectId: string) =>
    api.get<FinancialSummary>(`/invoices/project/${projectId}/financial-summary`),

  listDocuments: (projectId: string) =>
    api.get<NexusDocument[]>('/documents', { entityType: 'PROJECT', entityId: projectId }),

  getDocumentDownload: (documentId: string) =>
    api.get<{ document: NexusDocument; url: string }>(`/documents/${documentId}/download`),
};
