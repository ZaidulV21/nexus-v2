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
