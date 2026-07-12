import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  quotationService,
  type QuotationListParams,
  type CreateQuotationInput,
  type ReviseQuotationInput,
  type ApproveQuotationInput,
  type RejectQuotationInput,
  type RequestQuotationRevisionInput,
} from '@/services/quotationService';
import { queryKeys } from './keys';

export function useQuotationsList(params: QuotationListParams) {
  return useQuery({
    queryKey: queryKeys.quotations.list(params),
    queryFn: () => quotationService.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useQuotation(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.quotations.detail(id ?? ''),
    queryFn: () => quotationService.getById(id as string),
    enabled: !!id,
  });
}

export function useClientQuotationsList(clientId: string | undefined, params: QuotationListParams) {
  return useQuery({
    queryKey: queryKeys.quotations.clientList(clientId ?? '', params),
    queryFn: () => quotationService.listForClient(params),
    enabled: !!clientId,
    placeholderData: (prev) => prev,
  });
}

export function useClientQuotation(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.quotations.clientDetail(id ?? ''),
    queryFn: () => quotationService.getForClient(id as string),
    enabled: !!id,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuotationInput) => quotationService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
    },
  });
}

export function useReviseQuotation(quotationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviseQuotationInput) => quotationService.revise(quotationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
    },
  });
}

export function useApproveQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, input }: { versionId: string; input: ApproveQuotationInput }) => quotationService.approve(versionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
    },
  });
}

export function useSendQuotation(quotationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resend: boolean) => quotationService.send(quotationId, resend),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.clientDetail(quotationId) });
    },
  });
}

export function useRejectQuotation(quotationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RejectQuotationInput) => quotationService.reject(quotationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.clientDetail(quotationId) });
    },
  });
}

export function useRequestQuotationRevision(quotationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestQuotationRevisionInput) => quotationService.requestRevision(quotationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.clientDetail(quotationId) });
    },
  });
}

export function useAcceptQuotation(quotationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => quotationService.accept(quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.clientDetail(quotationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}
