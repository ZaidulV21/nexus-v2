import { api } from '@/lib/api';
import type { FinancialSummary, Invoice, NexusDocument, Project, ProjectMedia, ProjectMediaType } from '@/types';

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

export interface CreateProjectMediaInput {
  type: ProjectMediaType;
  url: string;
  posterUrl?: string;
  title?: string;
  altText?: string;
  caption?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
}

export interface UpdateProjectMediaInput {
  posterUrl?: string;
  title?: string;
  altText?: string;
  caption?: string;
  fileName?: string;
  isFeatured?: boolean;
  isActive?: boolean;
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

  /** Client-portal: only the authenticated client's own projects.
   *  Supports optional pagination (page/pageSize) - the backend returns
   *  { items, total } when paginated and a plain array otherwise, so callers
   *  must normalize with toClientList(). */
  listMine: (pagination?: { page?: number; pageSize?: number }) =>
    api.get<Project[] | { items: Project[]; total: number }>('/projects/me', pagination),

  getMine: (id: string) => api.get<Project>(`/projects/me/${id}`),

  updateServiceStatus: (projectServiceId: string, input: UpdateProjectServiceStatusInput) =>
    api.patch<{ id: string; status: string }>(`/projects/services/${projectServiceId}/status`, input),

  complete: (projectId: string) => api.post<Project>(`/projects/${projectId}/complete`),

  /** Portfolio title (public project name). */
  updateTitle: (projectId: string, title: string) => api.patch<Project>(`/projects/${projectId}`, { title }),

  listProjectMedia: (projectId: string) => api.get<ProjectMedia[]>(`/projects/${projectId}/media`),

  // Uploads an image, video or document; the backend infers the type from the
  // file's mimetype.
  uploadProjectMedia: (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<{ fileUrl: string; media: ProjectMedia }>(`/projects/${projectId}/media/upload`, formData);
  },

  uploadProjectMediaPoster: (projectId: string, mediaId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<{ fileUrl: string; media: ProjectMedia }>(
      `/projects/${projectId}/media/${mediaId}/poster`,
      formData
    );
  },

  createProjectMedia: (projectId: string, input: CreateProjectMediaInput) =>
    api.post<ProjectMedia>(`/projects/${projectId}/media`, input),

  updateProjectMedia: (projectId: string, mediaId: string, input: UpdateProjectMediaInput) =>
    api.patch<ProjectMedia>(`/projects/${projectId}/media/${mediaId}`, input),

  setFeaturedProjectMedia: (projectId: string, mediaId: string) =>
    api.post<ProjectMedia>(`/projects/${projectId}/media/${mediaId}/feature`),

  reorderProjectMedia: (projectId: string, orderedIds: string[]) =>
    api.post<{ orderedIds: string[] }>(`/projects/${projectId}/media/reorder`, { orderedIds }),

  deleteProjectMedia: (projectId: string, mediaId: string) =>
    api.delete<{ id: string; removed: boolean }>(`/projects/${projectId}/media/${mediaId}`),

  listInvoices: (projectId: string) => api.get<Invoice[]>(`/invoices/project/${projectId}`),

  getFinancialSummary: (projectId: string) =>
    api.get<FinancialSummary>(`/invoices/project/${projectId}/financial-summary`),

  listDocuments: (projectId: string) =>
    api.get<NexusDocument[]>('/documents', { entityType: 'PROJECT', entityId: projectId }),

  getDocumentDownload: (documentId: string) =>
    api.get<{ document: NexusDocument; url: string }>(`/documents/${documentId}/download`),
};
