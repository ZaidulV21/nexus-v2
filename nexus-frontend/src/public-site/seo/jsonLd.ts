// schema.org JSON-LD builders for the public marketing site. Each returns a
// plain object ready for SeoHead's `jsonLd` prop. Null/empty inputs produce
// undefined so callers can spread/omit without rendering empty nodes.

import { richTextToPlainText } from '@/lib/richText';

/** Minimal company shape consumed by the builders (matches usePublicCompany). */
export interface SeoCompany {
  name: string;
  tagline?: string;
  email?: string;
  phone?: string;
  fullAddress?: string;
  website?: string;
  logoUrl?: string | null;
  social?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  };
}

/** Turn a relative /uploads path into an absolute URL (origin from the browser). */
export function absoluteUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return window.location.origin + value;
  return value;
}

/** Absolute URL for a public-site path, e.g. siteUrl('/services') → origin + path. */
export function siteUrl(path = '/'): string {
  return window.location.origin + (path.startsWith('/') ? path : `/${path}`);
}

export function buildOrganizationJsonLd(company: SeoCompany, url: string): Record<string, unknown> {
  const node: Record<string, unknown> = {
    '@type': 'Organization',
    name: company.name,
    url,
  };
  const logo = absoluteUrl(company.logoUrl);
  if (logo) node.logo = logo;

  const sameAs = Object.values(company.social ?? {}).filter((v) => v && v.startsWith('http'));
  if (sameAs.length > 0) node.sameAs = sameAs;

  const contactPoint: Record<string, unknown> = {};
  if (company.phone) {
    contactPoint.telephone = company.phone;
    contactPoint.contactType = 'customer service';
    contactPoint.areaServed = 'IN';
    contactPoint.availableLanguage = 'en';
  } else if (company.email) {
    contactPoint.email = company.email;
    contactPoint.contactType = 'customer service';
  }
  if (Object.keys(contactPoint).length > 0) node.contactPoint = contactPoint;

  if (company.email) node.email = company.email;
  if (company.fullAddress) {
    node.address = { '@type': 'PostalAddress', addressCountry: 'IN', addressLocality: company.fullAddress };
  }

  return { '@context': 'https://schema.org', ...node };
}

export function buildWebSiteJsonLd(company: SeoCompany, url: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: company.name,
    url,
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface SeoFaq {
  question: string;
  answer: string;
}

export function buildFaqJsonLd(faqs: SeoFaq[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: richTextToPlainText(f.answer) },
    })),
  };
}

export interface ServiceSeoInput {
  name: string;
  description?: string;
  url: string;
  image?: string;
  serviceType?: string;
  price?: string;
  provider: SeoCompany;
  faqs?: SeoFaq[];
  testimonials?: Array<{ name: string; content: string; rating: number }>;
}

export function buildServiceJsonLd(input: ServiceSeoInput): Record<string, unknown> {
  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    provider: {
      '@type': 'Organization',
      name: input.provider.name,
      ...(absoluteUrl(input.provider.logoUrl) ? { logo: absoluteUrl(input.provider.logoUrl) } : {}),
    },
  };

  if (input.description) node.description = richTextToPlainText(input.description);
  node.url = input.url;
  const image = absoluteUrl(input.image);
  if (image) node.image = image;
  if (input.serviceType) node.serviceType = input.serviceType;

  if (input.price) {
    node.offers = { '@type': 'Offer', price: input.price, priceCurrency: 'INR' };
  }

  const reviews = (input.testimonials ?? []).filter((t) => t.name && t.content);
  if (reviews.length > 0) {
    const average = reviews.reduce((sum, t) => sum + (Number(t.rating) || 5), 0) / reviews.length;
    node.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: average.toFixed(1),
      reviewCount: reviews.length,
    };
    node.review = reviews.slice(0, 5).map((t) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: t.name },
      reviewBody: t.content,
      reviewRating: { '@type': 'Rating', ratingValue: Number(t.rating) || 5, bestRating: 5 },
    }));
  }

  return node;
}
