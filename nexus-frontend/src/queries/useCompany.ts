import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/queries/keys';
import { companyService, type UpdateCompanySettingsInput } from '@/services/companyService';

export function useCompanySettings() {
  return useQuery({
    queryKey: queryKeys.company.detail,
    queryFn: () => companyService.get(),
    staleTime: 60_000,
  });
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCompanySettingsInput) => companyService.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.company.all });
    },
  });
}

export function useUploadCompanyFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ field, file }: { field: string; file: File }) =>
      companyService.uploadFile(field, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.company.all });
    },
  });
}
