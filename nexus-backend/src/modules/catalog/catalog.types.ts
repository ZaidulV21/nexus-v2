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
