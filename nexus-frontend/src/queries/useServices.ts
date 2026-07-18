import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  serviceCatalogService,
  type ServiceListParams,
  type CreateServiceInput,
  type UpdateServiceInput,
} from '@/services/serviceCatalogService';
import { queryKeys } from './keys';

export function useServicesList(params: ServiceListParams) {
  return useQuery({
    queryKey: queryKeys.services.list(params),
    queryFn: () => serviceCatalogService.listAdmin(params),
    placeholderData: (prev) => prev, // keep old page visible while the next page loads
  });
}

export function useService(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.services.detail(id ?? ''),
    queryFn: () => serviceCatalogService.getById(id as string),
    enabled: !!id,
  });
}

export function useCategoryTree() {
  return useQuery({
    queryKey: queryKeys.services.categories,
    queryFn: () => serviceCatalogService.getCategoryTree(),
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateServiceInput) => serviceCatalogService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    },
  });
}

export function useUpdateService(serviceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateServiceInput) => serviceCatalogService.update(serviceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline('SERVICE', serviceId) });
    },
  });
}

export function useArchiveService(serviceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => serviceCatalogService.archive(serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline('SERVICE', serviceId) });
    },
  });
}

export function useRestoreService(serviceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => serviceCatalogService.restore(serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline('SERVICE', serviceId) });
    },
  });
}
