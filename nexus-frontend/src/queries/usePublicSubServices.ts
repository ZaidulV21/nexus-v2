import { useQuery } from '@tanstack/react-query';
import { serviceCatalogService } from '@/services/serviceCatalogService';
import { queryKeys } from './keys';
import type { SubService } from '@/types';
import type { SubServiceConfig } from '@/public-site/config/subServices';

/**
 * Map a CMS SubService to the public render shape (SubServiceConfig). The
 * long `description` is split on blank lines into overview paragraphs; the
 * structured arrays map straight across. Reviews aren't part of the CMS model
 * yet, so CMS sub-services render with the built-in "no reviews" state.
 */
export function toSubServiceConfig(sub: SubService): SubServiceConfig {
  const overview = (sub.description ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const gallery = (sub.gallery ?? []).filter(Boolean);

  return {
    slug: sub.slug,
    name: sub.name,
    shortDescription: sub.shortDescription?.trim() || sub.name,
    icon: sub.icon ?? 'Wrench',
    overview:
      overview.length > 0
        ? overview
        : [sub.shortDescription?.trim() || `${sub.name} — delivered end to end by our managed project team.`],
    gallery: gallery.length > 0 ? gallery : sub.heroImage ? [sub.heroImage] : [],
    heroImage: sub.heroImage ?? undefined,
    features: (sub.features ?? []).filter(Boolean),
    whatsIncluded: (sub.whatsIncluded ?? []).filter(Boolean),
    process: sub.process ?? [],
    startingPrice: sub.startingPrice ?? undefined,
    completionTime: sub.completionTime || 'Varies by scope — timelines shared during quotation',
    faqs: sub.faqs ?? [],
    reviews: [],
  };
}

/** Fetch the ACTIVE CMS sub-services for a service (by UUID or public slug). */
export function usePublicSubServices(serviceRef: string | undefined) {
  return useQuery({
    queryKey: queryKeys.services.publicSubServices(serviceRef ?? ''),
    queryFn: async () => {
      const result = await serviceCatalogService.listPublicSubServices(serviceRef as string);
      return result.items.map(toSubServiceConfig);
    },
    enabled: !!serviceRef,
    staleTime: 30_000,
  });
}
