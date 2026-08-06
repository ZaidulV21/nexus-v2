export interface CreateProjectInput {
  leadId: string;
  clientId: string;
  quotationVersionId?: string;
}

export interface AddServiceToProjectInput {
  serviceId: string;
  assignedQuotationVersionId?: string;
}

export interface UpdateProjectServiceStatusInput {
  toStatus: string;
  reason?: string;
}

export type ProjectMediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export interface CreateProjectMediaInput {
  type: ProjectMediaType;
  url: string;
  posterUrl?: string;
  title?: string;
  altText?: string;
  caption?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  sortOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
}

export interface UpdateProjectMediaInput {
  posterUrl?: string;
  title?: string;
  altText?: string;
  caption?: string;
  fileName?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}
