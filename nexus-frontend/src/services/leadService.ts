import { api } from '@/lib/api';
import type { Lead, LeadService as LeadServiceRecord } from '@/types';

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
  password?: string;
}

export interface UpdateLeadInput {
  contactName?: string;
  phone?: string;
  email?: string;
  companyName?: string;
}

export interface UpdateLeadServiceStatusInput {
  toStatus: string;
  reason?: string;
}

export interface ArchiveLeadInput {
  reason: string;
}

export interface LeadListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  archived?: boolean;
}

export interface LeadNote {
  id: string;
  leadId: string;
  authorUserId: string;
  note: string;
  createdAt: string;
}

// Maps 1:1 to backend routes in src/modules/lead/lead.routes.ts. No business
// logic lives here - this is a pure transport layer.
export const leadService = {
  list: (params: LeadListParams) =>
    api.getPaginated<Lead>('/leads', {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      archived: params.archived,
    }),

  getById: (id: string) => api.get<Lead>(`/leads/${id}`),

  create: (input: CreateLeadInput) => api.post<{ lead: Lead; leadServices: LeadServiceRecord[] }>('/leads', input),

  update: (id: string, input: UpdateLeadInput) => api.patch<Lead>(`/leads/${id}`, input),

  addService: (leadId: string, input: CreateLeadServiceInput) =>
    api.post<LeadServiceRecord>(`/leads/${leadId}/services`, input),

  updateServiceStatus: (leadServiceId: string, input: UpdateLeadServiceStatusInput) =>
    api.patch<LeadServiceRecord>(`/leads/${leadServiceId}/status`, input),

  addNote: (leadId: string, note: string) => api.post<LeadNote>(`/leads/${leadId}/notes`, { note }),

  listNotes: (leadId: string) => api.get<LeadNote[]>(`/leads/${leadId}/notes`),

  archive: (leadId: string, input: ArchiveLeadInput) =>
    api.patch<Lead>(`/leads/${leadId}/archive`, input),

  restore: (leadId: string) => api.patch<Lead>(`/leads/${leadId}/restore`),
};
