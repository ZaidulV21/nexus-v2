export interface CreateLeadServiceInput {
  serviceId: string;
  /** Optional Sub Service (public wizard picks a specific option, e.g. Signage -> Repair). Stored as an id. */
  subServiceId?: string;
  questionnaireAnswers?: Record<string, unknown>;
}

export interface CreateLeadInput {
  contactName: string;
  phone: string;
  email?: string;
  companyName?: string;
  source?: string;
  services: CreateLeadServiceInput[];
  /** When provided, a Client portal account is created alongside the Lead */
  password?: string;
  /** When provided, links this Lead to an existing Client (repeat enquiry) */
  clientId?: string;
}

export interface AddServiceToLeadInput {
  serviceId: string;
  subServiceId?: string;
  questionnaireAnswers?: Record<string, unknown>;
}

export interface UpdateLeadServiceStatusInput {
  toStatus: string;
  reason?: string;
}

export interface ArchiveLeadInput {
  reason: string;
}
