import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { quotationService, type QuotationListParams, type CreateQuotationInput, type ReviseQuotationInput, type ApproveQuotationInput } from '@/services/quotationService';
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
