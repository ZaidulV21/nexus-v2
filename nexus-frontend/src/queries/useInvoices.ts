import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  invoiceService,
  type CreateInvoiceInput,
  type InvoiceListParams,
  type RecordPaymentInput,
} from '@/services/invoiceService';
import { queryKeys } from './keys';

export function useInvoicesList(params: InvoiceListParams) {
  return useQuery({
    queryKey: queryKeys.invoices.list(params),
    queryFn: () => invoiceService.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id ?? ''),
    queryFn: () => invoiceService.getById(id as string),
    enabled: !!id,
  });
}

/** Client-portal: the authenticated client's own invoices. */
export function useMyInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices.clientList,
    queryFn: () => invoiceService.listMine(),
  });
}

export function useMyInvoice(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invoices.clientDetail(id ?? ''),
    queryFn: () => invoiceService.getMine(id as string),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => invoiceService.create(input),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.invoices(invoice.projectId) });
    },
  });
}

export function useSendInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resend: boolean) => invoiceService.send(invoiceId, resend),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.invoices(invoice.projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline('INVOICE', invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs('INVOICE', invoiceId) });
    },
  });
}

export function useCancelInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => invoiceService.cancel(invoiceId, reason),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.invoices(invoice.projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline('INVOICE', invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs('INVOICE', invoiceId) });
    },
  });
}

export function useRecordPayment(invoiceId: string, projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordPaymentInput) => invoiceService.recordPayment(invoiceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.invoices(projectId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline('INVOICE', invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs('INVOICE', invoiceId) });
    },
  });
}

export function usePaymentHistory(invoiceId: string | undefined, sortOrder: 'asc' | 'desc' = 'desc') {
  return useQuery({
    queryKey: [...queryKeys.invoices.detail(invoiceId ?? ''), 'payments', sortOrder] as const,
    queryFn: () => invoiceService.listPayments(invoiceId as string, sortOrder),
    enabled: !!invoiceId,
  });
}

export function useInvoicePdfUrl(invoiceId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.invoices.detail(invoiceId ?? ''), 'pdf'] as const,
    queryFn: () => invoiceService.getPdfUrl(invoiceId as string),
    enabled: !!invoiceId,
  });
}

export function useRegenerateInvoicePdf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => invoiceService.regeneratePdf(invoiceId),
    onSuccess: (_result, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.invoices.detail(invoiceId), 'pdf'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline('INVOICE', invoiceId) });
    },
  });
}

export function useReceiptUrl(paymentId: string | undefined) {
  return useQuery({
    queryKey: ['receipt', paymentId ?? ''] as const,
    queryFn: () => invoiceService.getReceiptUrl(paymentId as string),
    enabled: !!paymentId,
  });
}

export function useRegenerateReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => invoiceService.regenerateReceipt(paymentId),
    onSuccess: (_result, paymentId) => {
      queryClient.invalidateQueries({ queryKey: ['receipt', paymentId] });
    },
  });
}

export function useSendReceipt(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => invoiceService.sendReceipt(invoiceId, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline('INVOICE', invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs('INVOICE', invoiceId) });
    },
  });
}

export function useResendReceipt(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => invoiceService.resendReceipt(invoiceId, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline('INVOICE', invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.auditLogs('INVOICE', invoiceId) });
    },
  });
}
