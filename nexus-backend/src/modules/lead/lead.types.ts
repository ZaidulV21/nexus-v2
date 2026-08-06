export interface CreateLeadServiceInput {
  serviceId: string;
  /**
   * One or more Sub Services (e.g. Interior -> Painting, Flooring, Lighting).
   * Stored normalized via the lead_sub_services junction table - one row per
   * (Lead Service, Sub Service) pair, never comma-separated text.
   */
  subServiceIds?: string[];
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
  subServiceIds?: string[];
  questionnaireAnswers?: Record<string, unknown>;
}

export interface UpdateLeadServiceStatusInput {
  toStatus: string;
  reason?: string;
}

export interface ArchiveLeadInput {
  reason: string;
}
