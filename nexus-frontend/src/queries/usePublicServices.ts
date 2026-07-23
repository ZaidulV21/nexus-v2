import { useQuery } from '@tanstack/react-query';
import { serviceCatalogService } from '@/services/serviceCatalogService';
import { queryKeys } from './keys';
import { slugify } from '@/lib/utils';
import type { Service } from '@/types';
import type { ServiceItem } from '@/public-site/types';

/**
 * Map a backend Service to a public-facing ServiceItem.
 * The backend doesn't have `slug`, `shortDescription`, or `features`,
 * so we derive them from the available fields.
 */
function toServiceItem(service: Service): ServiceItem {
  const slug = slugify(service.name);
  const description = service.description ?? '';
  // Use first sentence as short description, or full description if short
  const shortDescription = description.length > 120
    ? description.split('.')[0].trim() + '.'
    : description || service.name;

  return {
    id: service.id,
    name: service.name,
    slug,
    description,
    shortDescription,
    icon: service.icon ?? 'Palette',
    image: service.imageUrl ?? undefined,
    features: [],
    category: service.category?.name ?? '',
  };
}

/** Fetch all ACTIVE services for the public website. */
export function usePublicServices() {
  return useQuery({
    queryKey: queryKeys.services.publicList,
    queryFn: async () => {
      const result = await serviceCatalogService.listServices({ pageSize: 100 });
      return result.items
        .filter((s) => s.isActive && !s.archivedAt)
        .map(toServiceItem);
    },
    staleTime: 30_000, // 30s — services don't change often
  });
}

/** Fetch a single active service by slug. */
export function usePublicServiceBySlug(slug: string | undefined) {
  const { data: services, ...rest } = usePublicServices();
  const service = services?.find((s) => s.slug === slug);
  return { data: service, ...rest };
}

/** Fetch all active services and return only the list (for Navbar, etc.). */
export function usePublicServiceList() {
  const { data, ...rest } = usePublicServices();
  return { data: data ?? [], ...rest };
}
