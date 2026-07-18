import { api } from '@/lib/api';
import type { Service, Category } from '@/types';

export type ServiceStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface ServiceListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ServiceStatusFilter;
  categoryId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateServiceInput {
  categoryId: string;
  name: string;
  description?: string;
  basePrice?: number;
  estimatedDuration?: string;
  requiresSiteVisit: 'YES' | 'NO' | 'OPTIONAL';
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
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
  // Admin catalog list - authenticated, supports status/category filters and
  // real pagination (unlike listServices, which powers selection dropdowns).
  listAdmin: (params: ServiceListParams) =>
    api.getPaginated<Service>('/services', {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      status: params.status,
      categoryId: params.categoryId,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    }),
  getById: (id: string) => api.get<Service>(`/services/${id}`),
  create: (input: CreateServiceInput) => api.post<Service>('/services', input),
  update: (id: string, input: UpdateServiceInput) => api.patch<Service>(`/services/${id}`, input),
  archive: (id: string) => api.patch<Service>(`/services/${id}/archive`),
  restore: (id: string) => api.patch<Service>(`/services/${id}/restore`),
  getCategoryTree: () => api.get<Category[]>('/categories'),
};
