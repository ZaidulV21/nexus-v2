import { api } from '@/lib/api';
import type {
  Service,
  Category,
  SubService,
  SubServiceFaq,
  SubServiceProcessStep,
  ServiceMedia,
  ServiceMediaType,
  ServiceProcessStep,
  ServiceFaq,
  ServiceTestimonial,
} from '@/types';

export type ServiceStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'DELETED';

export type PublicationFilter = 'ALL' | 'DRAFT' | 'PUBLISHED';

/** Actions accepted by the shared bulk endpoint (services + sub-services). */
export type BulkCatalogAction =
  | 'archive'
  | 'restore'
  | 'delete'
  | 'undelete'
  | 'activate'
  | 'deactivate'
  | 'publish'
  | 'draft';

export type ServiceImageField = 'imageUrl' | 'bannerImage' | 'thumbnail' | 'heroImage' | 'ogImage';

/** Maps each CMS image slot to the URL field on the Service record. */
export const SERVICE_IMAGE_FIELDS: ServiceImageField[] = [
  'imageUrl',
  'bannerImage',
  'thumbnail',
  'heroImage',
  'ogImage',
];

export interface ServiceListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ServiceStatusFilter;
  categoryId?: string;
  featured?: boolean;
  popular?: boolean;
  /** Publication lifecycle filter (admin catalog list). */
  publication?: PublicationFilter;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateServiceInput {
  categoryId: string;
  name: string;
  /** SEO URL segment. Auto-generated from `name` when omitted. */
  slug?: string;
  description?: string;
  shortDescription?: string;
  icon?: string;
  imageUrl?: string;
  bannerImage?: string;
  thumbnail?: string;
  heroImage?: string;
  basePrice?: number;
  estimatedDuration?: string;
  requiresSiteVisit: 'YES' | 'NO' | 'OPTIONAL';
  isFeatured?: boolean;
  isPopular?: boolean;
  sortOrder?: number;
  seoTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
  /** Optional custom schema.org JSON-LD (object or @graph array). */
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
  /** Public detail-page content blocks (JSON arrays, mirroring SubService). */
  features?: string[];
  whatsIncluded?: string[];
  process?: ServiceProcessStep[];
  faqs?: ServiceFaq[];
  testimonials?: ServiceTestimonial[];
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  isActive?: boolean;
}

export type SubServiceStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'DELETED';

/** Maps each CMS image slot on a Sub Service to its URL field. `gallery`
 *  appends to the JSON array (uploads) or filters by URL (removals). */
export type SubServiceImageField = 'heroImage' | 'ogImage' | 'gallery';

export interface SubServiceListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: SubServiceStatusFilter;
  /** Publication lifecycle filter (admin list). */
  publication?: PublicationFilter;
}

export interface CreateSubServiceInput {
  name: string;
  /** URL segment within the parent service. Auto-generated from `name` when omitted. */
  slug?: string;
  shortDescription?: string;
  description?: string;
  icon?: string;
  heroImage?: string;
  gallery?: string[];
  features?: string[];
  whatsIncluded?: string[];
  process?: SubServiceProcessStep[];
  faqs?: SubServiceFaq[];
  startingPrice?: string;
  completionTime?: string;
  isActive?: boolean;
  sortOrder?: number;
  seoTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
  /** Optional custom schema.org JSON-LD (object or @graph array). */
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export interface UpdateSubServiceInput extends Partial<CreateSubServiceInput> {}

export interface CreateServiceMediaInput {
  type: ServiceMediaType;
  url: string;
  posterUrl?: string;
  altText?: string;
  caption?: string;
  sortOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
}

/** URL and type are immutable after creation; only presentation + visibility
 *  can change. */
export interface UpdateServiceMediaInput {
  posterUrl?: string;
  altText?: string;
  caption?: string;
  sortOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
}

export const serviceCatalogService = {
  // Selection dropdowns (lead/quotation forms) - only selectable services.
  // status=ACTIVE matters because authenticated admins would otherwise see
  // the unfiltered catalog, archived services included.
  listServices: (params?: { search?: string; pageSize?: number }) =>
    api.getPaginated<Service>('/services', {
      pageSize: params?.pageSize ?? 100,
      search: params?.search,
      status: 'ACTIVE',
    }),
  // Admin catalog list - authenticated, supports status/category/featured/
  // popular filters and real pagination (unlike listServices, which powers
  // selection dropdowns).
  listAdmin: (params: ServiceListParams) =>
    api.getPaginated<Service>('/services', {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      status: params.status,
      categoryId: params.categoryId,
      featured: params.featured,
      popular: params.popular,
      publication: params.publication,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    }),
  getById: (id: string) => api.get<Service>(`/services/${id}`),
  create: (input: CreateServiceInput) => api.post<Service>('/services', input),
  update: (id: string, input: UpdateServiceInput) => api.patch<Service>(`/services/${id}`, input),
  // Uploads an image into a specific CMS slot (defaults to imageUrl).
  uploadImage: (id: string, file: File, field: ServiceImageField = 'imageUrl') => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<{ fileUrl: string; service: Service }>(
      `/services/${id}/image?field=${encodeURIComponent(field)}`,
      formData,
    );
  },
  removeImage: (id: string, field: ServiceImageField = 'imageUrl') =>
    api.delete<{ service: Service }>(`/services/${id}/image?field=${encodeURIComponent(field)}`),
  archive: (id: string) => api.patch<Service>(`/services/${id}/archive`),
  restore: (id: string) => api.patch<Service>(`/services/${id}/restore`),
  // Draft/publish lifecycle. Publishing also forces isActive so the row is
  // selectable + visible once live; drafting keeps it editable but hidden.
  publish: (id: string) => api.patch<Service>(`/services/${id}/publish`),
  draft: (id: string) => api.patch<Service>(`/services/${id}/draft`),
  /** Bulk action across services (archive/restore/delete/undelete/activate/
   *  deactivate/publish/draft). Returns the updated records. */
  bulk: (ids: string[], action: BulkCatalogAction) =>
    api.post<{ ids: string[]; action: BulkCatalogAction; updatedCount: number }>('/services/bulk', { ids, action }),
  // Soft delete: hidden everywhere but stays on historical records. Reversible.
  softDelete: (id: string) => api.delete<Service>(`/services/${id}`),
  undelete: (id: string) => api.post<Service>(`/services/${id}/undelete`),
  duplicate: (id: string) => api.post<Service>(`/services/${id}/duplicate`),
  getCategoryTree: () => api.get<Category[]>('/categories'),
  createCategory: (input: { name: string; parentCategoryId?: string }) =>
    api.post<Category>('/categories', input),
  updateCategory: (id: string, input: { name?: string; parentCategoryId?: string | null }) =>
    api.put<Category>(`/categories/${id}`, input),
  disableCategory: (id: string) => api.patch<Category>(`/categories/${id}/disable`),

  // ── Sub Services ────────────────────────────────────────────────────────
  // `serviceRef` is the parent service UUID (admin) or its public slug
  // (public site) - the backend resolves both.
  listSubServices: (serviceRef: string, params: SubServiceListParams = {}) =>
    api.getPaginated<SubService>(`/services/${serviceRef}/sub-services`, {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      status: params.status,
      publication: params.publication,
    }),
  // Public site: always ACTIVE, ordered by sortOrder.
  listPublicSubServices: (serviceRef: string) =>
    api.getPaginated<SubService>(`/services/${serviceRef}/sub-services`, {
      pageSize: 100,
      status: 'ACTIVE',
    }),
  createSubService: (serviceRef: string, input: CreateSubServiceInput) =>
    api.post<SubService>(`/services/${serviceRef}/sub-services`, input),
  updateSubService: (serviceRef: string, subId: string, input: UpdateSubServiceInput) =>
    api.patch<SubService>(`/services/${serviceRef}/sub-services/${subId}`, input),
  uploadSubServiceImage: (serviceRef: string, subId: string, file: File, field: SubServiceImageField = 'heroImage') => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<{ fileUrl: string; subService: SubService }>(
      `/services/${serviceRef}/sub-services/${subId}/image?field=${encodeURIComponent(field)}`,
      formData,
    );
  },
  removeSubServiceImage: (serviceRef: string, subId: string, field: SubServiceImageField = 'heroImage', url?: string) =>
    api.delete<{ subService: SubService }>(
      `/services/${serviceRef}/sub-services/${subId}/image?field=${encodeURIComponent(field)}${
        url ? `&url=${encodeURIComponent(url)}` : ''
      }`,
    ),
  archiveSubService: (serviceRef: string, subId: string) =>
    api.patch<SubService>(`/services/${serviceRef}/sub-services/${subId}/archive`),
  restoreSubService: (serviceRef: string, subId: string) =>
    api.patch<SubService>(`/services/${serviceRef}/sub-services/${subId}/restore`),
  publishSubService: (serviceRef: string, subId: string) =>
    api.patch<SubService>(`/services/${serviceRef}/sub-services/${subId}/publish`),
  draftSubService: (serviceRef: string, subId: string) =>
    api.patch<SubService>(`/services/${serviceRef}/sub-services/${subId}/draft`),
  /** Bulk action across sub-services under one service. */
  bulkSubServices: (serviceRef: string, ids: string[], action: BulkCatalogAction) =>
    api.post<{ ids: string[]; action: BulkCatalogAction; updatedCount: number }>(
      `/services/${serviceRef}/sub-services/bulk`,
      { ids, action },
    ),
  softDeleteSubService: (serviceRef: string, subId: string) =>
    api.delete<SubService>(`/services/${serviceRef}/sub-services/${subId}`),
  undeleteSubService: (serviceRef: string, subId: string) =>
    api.post<SubService>(`/services/${serviceRef}/sub-services/${subId}/undelete`),
  duplicateSubService: (serviceRef: string, subId: string) =>
    api.post<SubService>(`/services/${serviceRef}/sub-services/${subId}/duplicate`),
  reorderSubServices: (serviceRef: string, orderedIds: string[]) =>
    api.post<{ orderedIds: string[] }>(`/services/${serviceRef}/sub-services/reorder`, { orderedIds }),

  // ── Service Marketing Gallery ────────────────────────────────────────────
  // `serviceRef` is the parent service UUID (admin) or its public slug
  // (public site) - the backend resolves both.
  // Public site: returns only visible items, ordered by sortOrder.
  listPublicServiceMedia: (serviceRef: string) => api.get<ServiceMedia[]>(`/services/${serviceRef}/media`),
  // Admin: authenticated, includes hidden items.
  listServiceMedia: (serviceRef: string) => api.get<ServiceMedia[]>(`/services/${serviceRef}/media`),
  // Uploads an image or video file and creates a gallery item (the backend
  // infers the media type from the file's mimetype).
  uploadServiceMedia: (serviceRef: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<{ fileUrl: string; media: ServiceMedia }>(
      `/services/${serviceRef}/media/upload`,
      formData,
    );
  },
  uploadServiceMediaPoster: (serviceRef: string, mediaId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<{ fileUrl: string; media: ServiceMedia }>(
      `/services/${serviceRef}/media/${mediaId}/poster`,
      formData,
    );
  },
  createServiceMedia: (serviceRef: string, input: CreateServiceMediaInput) =>
    api.post<ServiceMedia>(`/services/${serviceRef}/media`, input),
  updateServiceMedia: (serviceRef: string, mediaId: string, input: UpdateServiceMediaInput) =>
    api.patch<ServiceMedia>(`/services/${serviceRef}/media/${mediaId}`, input),
  setFeaturedServiceMedia: (serviceRef: string, mediaId: string) =>
    api.post<ServiceMedia>(`/services/${serviceRef}/media/${mediaId}/feature`),
  /** Toggle whether a gallery item is shown on the public site. */
  toggleServiceMediaActive: (serviceRef: string, mediaId: string) =>
    api.patch<ServiceMedia>(`/services/${serviceRef}/media/${mediaId}/toggle-active`),
  reorderServiceMedia: (serviceRef: string, orderedIds: string[]) =>
    api.post<{ orderedIds: string[] }>(`/services/${serviceRef}/media/reorder`, { orderedIds }),
  deleteServiceMedia: (serviceRef: string, mediaId: string) =>
    api.delete<{ id: string; removed: boolean }>(`/services/${serviceRef}/media/${mediaId}`),
};
