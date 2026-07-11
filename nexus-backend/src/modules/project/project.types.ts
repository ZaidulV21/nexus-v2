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
