export interface CreateLeadServiceInput {
  serviceId: string;
  questionnaireAnswers?: Record<string, unknown>;
}

export interface CreateLeadInput {
  contactName: string;
  phone: string;
  email?: string;
  companyName?: string;
  source?: string;
  services: CreateLeadServiceInput[];
}

export interface AddServiceToLeadInput {
  serviceId: string;
  questionnaireAnswers?: Record<string, unknown>;
}

export interface UpdateLeadServiceStatusInput {
  toStatus: string;
  reason?: string;
}

export interface ArchiveLeadInput {
  reason: string;
}
