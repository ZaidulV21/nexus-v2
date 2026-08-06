import { useQuery } from '@tanstack/react-query';
import { portfolioService } from '@/services/portfolioService';
import { queryKeys } from './keys';

/** Public website: recent completed projects for the home page. */
export function useRecentProjects(limit = 6) {
  return useQuery({
    queryKey: queryKeys.portfolio.list({ limit }),
    queryFn: () => portfolioService.list({ limit }),
  });
}

/** Public website: a specific service's completed projects. */
export function useServicePortfolio(serviceSlug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.portfolio.byService(serviceSlug ?? ''),
    queryFn: () => portfolioService.list({ serviceSlug: serviceSlug as string }),
    enabled: !!serviceSlug,
  });
}

/** Public website: portfolio headline (total completed projects). */
export function usePortfolioSummary() {
  return useQuery({
    queryKey: queryKeys.portfolio.summary,
    queryFn: () => portfolioService.summary(),
  });
}
