export interface CreateCategoryInput {
  name: string;
  parentCategoryId?: string;
}

export interface CreateServiceInput {
  categoryId: string;
  name: string;
  // SEO URL segment. Auto-generated from `name` when omitted.
  slug?: string;
  description?: string;
  shortDescription?: string;
  icon?: string;
  imageUrl?: string;
  bannerImage?: string;
  thumbnail?: string;
  heroImage?: string;
  basePrice?: number;
  estimatedDuration?: string;
  requiresSiteVisit: 'YES' | 'NO' | 'OPTIONAL';
  isFeatured?: boolean;
  isPopular?: boolean;
  sortOrder?: number;
  seoTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  isActive?: boolean;
}

// Filters accepted by the admin service list on top of the shared
// pagination params. Public callers are always forced to ACTIVE.
export interface ServiceListFilters {
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'DELETED';
  categoryId?: string;
  /** When true, only featured services are returned. */
  featured?: boolean;
  /** When true, only popular services are returned. */
  popular?: boolean;
}

export interface SubServiceProcessStep {
  title: string;
  description: string;
}

export interface SubServiceFaq {
  question: string;
  answer: string;
}

export interface CreateSubServiceInput {
  name: string;
  // SEO URL segment within the parent service. Auto-generated from `name`
  // when omitted, and unique per service.
  slug?: string;
  shortDescription?: string;
  description?: string;
  icon?: string;
  heroImage?: string;
  gallery?: string[];
  features?: string[];
  whatsIncluded?: string[];
  process?: SubServiceProcessStep[];
  faqs?: SubServiceFaq[];
  startingPrice?: string;
  completionTime?: string;
  isActive?: boolean;
  sortOrder?: number;
  seoTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImage?: string;
  canonicalUrl?: string;
}

export interface UpdateSubServiceInput extends Partial<CreateSubServiceInput> {}

// Filters accepted by the admin sub-service list. Public callers are always
// forced to ACTIVE. `search` matches name/slug.
export interface SubServiceListFilters {
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'DELETED';
  search?: string;
}

export type ServiceMediaType = 'IMAGE' | 'VIDEO';

// A single item in a Service's marketing gallery. Media is uploaded (image or
// video file) or added by URL, then annotated with alt text / caption and
// ordered. `isFeatured` marks the showcase highlight (at most one per service).
export interface CreateServiceMediaInput {
  type: ServiceMediaType;
  url: string;
  posterUrl?: string;
  altText?: string;
  caption?: string;
  sortOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
}

// URL and type are immutable after creation (the file/URL never changes); the
// admin only edits presentation + visibility.
export interface UpdateServiceMediaInput {
  posterUrl?: string;
  altText?: string;
  caption?: string;
  sortOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
}
