import { useQuery } from '@tanstack/react-query';
import { serviceCatalogService } from '@/services/serviceCatalogService';
import { queryKeys } from './keys';
import { slugify } from '@/lib/utils';
import type { Service } from '@/types';
import type { ServiceItem } from '@/public-site/types';

/**
 * Map a backend Service to a public-facing ServiceItem.
 * Prefers the CMS-managed `slug` / `shortDescription`, falling back to
 * derived values for rows seeded before the CMS fields existed.
 */
function toServiceItem(service: Service): ServiceItem {
  const slug = service.slug || slugify(service.name);
  const description = service.description ?? '';
  const shortDescription =
    service.shortDescription?.trim() ||
    (description.length > 120 ? description.split('.')[0].trim() + '.' : description || service.name);

  const gallery = [service.heroImage, service.bannerImage, service.imageUrl, service.thumbnail].filter(
    (url): url is string => Boolean(url)
  );

  return {
    id: service.id,
    name: service.name,
    slug,
    description,
    shortDescription,
    icon: service.icon ?? 'Palette',
    image: service.imageUrl ?? service.thumbnail ?? service.heroImage ?? service.bannerImage ?? undefined,
    features: service.features ?? [],
    category: service.category?.name ?? '',
    categoryId: service.categoryId,
    heroImage: service.heroImage ?? service.bannerImage ?? service.imageUrl ?? undefined,
    gallery,
    whatsIncluded: service.whatsIncluded ?? [],
    process: service.process ?? [],
    faqs: service.faqs ?? [],
    testimonials: service.testimonials ?? [],
    basePrice: service.basePrice ? Number(service.basePrice) : undefined,
    estimatedDuration: service.estimatedDuration ?? undefined,
  };
}

/** Fetch all ACTIVE services for the public website. */
export function usePublicServices() {
  return useQuery({
    queryKey: queryKeys.services.publicList,
    queryFn: async () => {
      const result = await serviceCatalogService.listServices({ pageSize: 100 });
      return result.items
        .filter((s) => s.isActive && !s.archivedAt && !s.deletedAt)
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
