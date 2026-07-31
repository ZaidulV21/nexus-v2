import { api } from '@/lib/api';
import type { Payment } from '@/types';

export interface PaymentListParams {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  clientId?: string;
  invoiceId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const paymentService = {
  list: (params: PaymentListParams) =>
    api.getPaginated<Payment>('/payments', {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      status: params.status,
      clientId: params.clientId,
      invoiceId: params.invoiceId,
      projectId: params.projectId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
};
