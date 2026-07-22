import { api } from '@/lib/api';
import type { Invoice, Payment } from '@/types';

export interface InvoiceListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RecordPaymentInput {
  amount: number;
  method: string;
  transactionReference?: string;
  referenceNote?: string;
}

export interface CreateInvoiceInput {
  projectId: string;
  clientId: string;
  label: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    hsnSacCode: string;
    taxRate: number;
  }>;
}

export const invoiceService = {
  create: (input: CreateInvoiceInput) => api.post<Invoice>('/invoices', input),

  list: (params: InvoiceListParams) =>
    api.getPaginated<Invoice>('/invoices', {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    }),

  getById: (id: string) => api.get<Invoice>(`/invoices/${id}`),

  /** Client-portal: only the authenticated client's own invoices. */
  listMine: () => api.get<Invoice[]>('/invoices/me'),

  getMine: (id: string) => api.get<Invoice>(`/invoices/me/${id}`),

  send: (invoiceId: string, resend = false) => api.post<Invoice>(`/invoices/${invoiceId}/send`, { resend }),

  cancel: (invoiceId: string, reason: string) => api.patch<Invoice>(`/invoices/${invoiceId}/cancel`, { reason }),

  recordPayment: (invoiceId: string, input: RecordPaymentInput) =>
    api.post<Payment>(`/invoices/${invoiceId}/payments`, input),

  listPayments: (invoiceId: string, sortOrder: 'asc' | 'desc' = 'desc') =>
    api.get<Payment[]>(`/invoices/${invoiceId}/payments`, { sort: sortOrder }),

  getPdfUrl: (id: string) => api.get<{ pdfUrl: string }>(`/pdf/INVOICE/${id}`),
  regeneratePdf: (id: string) =>
    api.post<{ pdfUrl: string; generatedAt: string; fileSize: number }>(`/pdf/INVOICE/${id}/regenerate`),

  getReceiptUrl: (paymentId: string) => api.get<{ pdfUrl: string }>(`/pdf/RECEIPT/${paymentId}`),
  regenerateReceipt: (paymentId: string) =>
    api.post<{ pdfUrl: string; generatedAt: string; fileSize: number }>(`/pdf/RECEIPT/${paymentId}/regenerate`),
  sendReceipt: (invoiceId: string, paymentId: string) =>
    api.post<Payment>(`/invoices/${invoiceId}/payments/${paymentId}/send-receipt`),
  resendReceipt: (invoiceId: string, paymentId: string) =>
    api.post<Payment>(`/invoices/${invoiceId}/payments/${paymentId}/resend-receipt`),
};
