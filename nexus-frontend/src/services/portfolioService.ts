import { api } from '@/lib/api';
import type { PublicPortfolioProject } from '@/types';

export interface PortfolioListParams {
  limit?: number;
  // Service public slug (or UUID) — used by the "Related Completed Projects"
  // section on a service's public detail page.
  serviceSlug?: string;
}

export const portfolioService = {
  /** Public portfolio: completed projects, newest first. Grows automatically. */
  list: (params?: PortfolioListParams) =>
    api.get<PublicPortfolioProject[]>('/portfolio', {
      limit: params?.limit,
      serviceSlug: params?.serviceSlug,
    }),

  summary: () => api.get<{ completedProjects: number }>('/portfolio/summary'),
};
