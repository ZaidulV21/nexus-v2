import { useQuery } from '@tanstack/react-query';
import { serviceCatalogService } from '@/services/serviceCatalogService';
import { queryKeys } from './keys';

/** Fetch the ACTIVE CMS sub-services for a service (by UUID or public slug). */
export function usePublicSubServices(serviceRef: string | undefined) {
  return useQuery({
    queryKey: queryKeys.services.publicSubServices(serviceRef ?? ''),
    queryFn: async () => {
      const result = await serviceCatalogService.listPublicSubServices(serviceRef as string);
      return result.items;
    },
    enabled: !!serviceRef,
    staleTime: 30_000,
  });
}
