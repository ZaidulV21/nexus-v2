import { api } from '@/lib/api';
import type { Service, Category } from '@/types';

export const serviceCatalogService = {
  listServices: (params?: { search?: string; pageSize?: number }) =>
    api.getPaginated<Service>('/services', { pageSize: params?.pageSize ?? 100, search: params?.search }),
  getCategoryTree: () => api.get<Category[]>('/categories'),
};
