export interface CreateCategoryInput {
  name: string;
  parentCategoryId?: string;
}

export interface CreateServiceInput {
  categoryId: string;
  name: string;
  description?: string;
  icon?: string;
  basePrice?: number;
  estimatedDuration?: string;
  requiresSiteVisit: 'YES' | 'NO' | 'OPTIONAL';
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  isActive?: boolean;
}

// Filters accepted by the admin service list on top of the shared
// pagination params. Public callers are always forced to ACTIVE.
export interface ServiceListFilters {
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  categoryId?: string;
}
