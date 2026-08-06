import { formatCurrency } from '@/lib/format';
import type { ServiceFaq, ServiceProcessStep, ServiceTestimonial, SubService } from '@/types';
import type { ServiceItem } from '../types';

/**
 * The render shape for the public service detail page. Every field is derived
 * from CMS data (Service / SubService) — nothing is hardcoded marketing copy.
 */
export interface ServiceDetailContent {
  overview: string[];
  gallery: string[];
  features: string[];
  whatsIncluded: string[];
  process: ServiceProcessStep[];
  startingPrice?: string;
  completionTime: string;
  faqs: ServiceFaq[];
  testimonials: ServiceTestimonial[];
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function startingPriceFrom(basePrice?: number): string | undefined {
  if (basePrice == null || Number.isNaN(basePrice)) return undefined;
  return formatCurrency(basePrice);
}

/** Map a public ServiceItem (populated from the backend Service) to detail content. */
export function toServiceDetailContent(service: ServiceItem): ServiceDetailContent {
  return {
    overview: splitParagraphs(service.description),
    gallery: (service.gallery ?? []).filter(Boolean),
    features: (service.features ?? []).filter(Boolean),
    whatsIncluded: (service.whatsIncluded ?? []).filter(Boolean),
    process: service.process ?? [],
    startingPrice: startingPriceFrom(service.basePrice),
    completionTime: service.estimatedDuration ?? '',
    faqs: service.faqs ?? [],
    testimonials: service.testimonials ?? [],
  };
}

/** Map a CMS SubService to detail content. Testimonials live on the parent
 *  service, so the page inherits them onto the sub-route separately. */
export function toSubServiceDetailContent(sub: SubService): ServiceDetailContent {
  const overview = splitParagraphs(sub.description ?? '');
  const gallery = (sub.gallery ?? []).filter(Boolean);
  return {
    overview: overview.length > 0 ? overview : sub.shortDescription?.trim() ? [sub.shortDescription.trim()] : [],
    gallery: gallery.length > 0 ? gallery : sub.heroImage ? [sub.heroImage] : [],
    features: (sub.features ?? []).filter(Boolean),
    whatsIncluded: (sub.whatsIncluded ?? []).filter(Boolean),
    process: sub.process ?? [],
    startingPrice: sub.startingPrice ?? undefined,
    completionTime: sub.completionTime ?? '',
    faqs: sub.faqs ?? [],
    testimonials: [],
  };
}
