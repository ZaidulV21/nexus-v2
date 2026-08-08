export interface CreateCategoryInput {
  name: string;
  parentCategoryId?: string;
}

export interface ServiceProcessStep {
  title: string;
  description: string;
}

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServiceTestimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatar?: string;
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
  // Optional custom schema.org JSON-LD (object or @graph array).
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
  // Public detail-page content blocks (JSON arrays, mirroring SubService).
  features?: string[];
  whatsIncluded?: string[];
  process?: ServiceProcessStep[];
  faqs?: ServiceFaq[];
  testimonials?: ServiceTestimonial[];
  // Draft/publish lifecycle. Defaults to PUBLISHED so new services appear
  // immediately; set DRAFT to keep an in-progress service off the website.
  publicationState?: PublicationState;
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  isActive?: boolean;
}

// Payload for the services bulk-action endpoint.
export interface BulkServiceInput {
  ids: string[];
  action: BulkCatalogAction;
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
  /** Admin triage: only drafts or only published rows. */
  publication?: 'ALL' | 'DRAFT' | 'PUBLISHED';
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
  // Optional custom schema.org JSON-LD (object or @graph array).
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
  // Draft/publish lifecycle, mirroring Service.
  publicationState?: PublicationState;
}

export interface UpdateSubServiceInput extends Partial<CreateSubServiceInput> {}

// Payload for the sub-services bulk-action endpoint.
export interface BulkSubServiceInput {
  ids: string[];
  action: BulkCatalogAction;
}

// Filters accepted by the admin sub-service list. Public callers are always
// forced to ACTIVE. `search` matches name/slug.
export interface SubServiceListFilters {
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'DELETED';
  search?: string;
  /** Admin triage: only drafts or only published rows. */
  publication?: 'ALL' | 'DRAFT' | 'PUBLISHED';
}

export type ServiceMediaType = 'IMAGE' | 'VIDEO';

// Draft/publish lifecycle shared by Service and SubService. DRAFT rows never
// reach the public website; PUBLISHED rows appear when the other status flags
// (isActive / archived / deleted) allow them to.
export type PublicationState = 'DRAFT' | 'PUBLISHED';

// Actions accepted by the bulk endpoints on both services and sub-services.
export type BulkCatalogAction =
  | 'archive'
  | 'restore'
  | 'delete'
  | 'undelete'
  | 'activate'
  | 'deactivate'
  | 'publish'
  | 'draft';

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
