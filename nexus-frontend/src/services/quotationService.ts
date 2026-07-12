import { api } from '@/lib/api';
import type { Quotation } from '@/types';

export interface QuotationListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateQuotationInput {
  leadId: string;
  clientId?: string;
  discount?: number;
  transportation?: number;
  installation?: number;
  items: Array<{
    serviceId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
}

export interface ReviseQuotationInput extends Omit<CreateQuotationInput, 'leadId' | 'clientId'> {}

export interface ApproveQuotationInput {
  approvalMethod: 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'IN_PERSON';
}

export const quotationService = {
  list: (params: QuotationListParams) =>
    api.getPaginated<Quotation>('/quotations', {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    }),
  getById: (id: string) => api.get<Quotation>(`/quotations/${id}`),
  create: (input: CreateQuotationInput) => api.post<Quotation>('/quotations', input),
  revise: (id: string, input: ReviseQuotationInput) => api.post<Quotation>(`/quotations/${id}/revise`, input),
  approve: (versionId: string, input: ApproveQuotationInput) => api.post<Quotation>(`/quotations/versions/${versionId}/approve`, input),
};
