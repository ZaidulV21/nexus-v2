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
  requiresSiteVisit: 'YES' | 'NO' | 'OPTIONAL';
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {}
