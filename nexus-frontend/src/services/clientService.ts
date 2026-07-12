import { api } from '@/lib/api';
import type { Client } from '@/types';

export interface ClientListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateClientInput {
  companyName?: string;
  contactName?: string;
  phone?: string;
}

// Convert-to-Client is exposed here (rather than deferred to the Clients
// module build) because it is triggered from the Lead workflow itself -
// PRD: "normally occurs when the quotation is accepted and the project is
// officially created", initiated from the Lead's own detail page.
export const clientService = {
  convertLead: (leadId: string) => api.post<Client>(`/clients/convert/${leadId}`),
  list: (params: ClientListParams) =>
    api.getPaginated<Client>('/clients', {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    }),
  getById: (id: string) => api.get<Client>(`/clients/${id}`),
  update: (id: string, input: UpdateClientInput) => api.patch<Client>(`/clients/${id}`, input),
};
