import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  serviceCatalogService,
  type ServiceListParams,
  type CreateServiceInput,
  type UpdateServiceInput,
  type SubServiceListParams,
  type CreateSubServiceInput,
  type UpdateSubServiceInput,
  type CreateServiceMediaInput,
  type UpdateServiceMediaInput,
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

export function useDuplicateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) => serviceCatalogService.duplicate(serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
    },
  });
}

export function useSoftDeleteService(serviceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => serviceCatalogService.softDelete(serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline('SERVICE', serviceId) });
    },
  });
}

export function useUndeleteService(serviceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => serviceCatalogService.undelete(serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline('SERVICE', serviceId) });
    },
  });
}

// ── Sub Services ───────────────────────────────────────────────────────────

function useInvalidateSubServices(serviceRef: string) {
  const queryClient = useQueryClient();
  return (subId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.services.subServices(serviceRef) });
    if (subId) queryClient.invalidateQueries({ queryKey: queryKeys.timeline('SUB_SERVICE', subId) });
  };
}

export function useSubServicesList(serviceRef: string, params: SubServiceListParams) {
  return useQuery({
    queryKey: queryKeys.services.subServicesList(serviceRef, params),
    queryFn: () => serviceCatalogService.listSubServices(serviceRef, params),
    enabled: !!serviceRef,
    placeholderData: (prev) => prev,
  });
}

export function useCreateSubService(serviceRef: string) {
  const invalidate = useInvalidateSubServices(serviceRef);
  return useMutation({
    mutationFn: (input: CreateSubServiceInput) => serviceCatalogService.createSubService(serviceRef, input),
    onSuccess: (sub) => invalidate(sub.id),
  });
}

export function useUpdateSubService(serviceRef: string, subId: string) {
  const invalidate = useInvalidateSubServices(serviceRef);
  return useMutation({
    mutationFn: (input: UpdateSubServiceInput) => serviceCatalogService.updateSubService(serviceRef, subId, input),
    onSuccess: (sub) => invalidate(sub.id),
  });
}

export function useArchiveSubService(serviceRef: string, subId: string) {
  const invalidate = useInvalidateSubServices(serviceRef);
  return useMutation({
    mutationFn: () => serviceCatalogService.archiveSubService(serviceRef, subId),
    onSuccess: (sub) => invalidate(sub.id),
  });
}

export function useRestoreSubService(serviceRef: string, subId: string) {
  const invalidate = useInvalidateSubServices(serviceRef);
  return useMutation({
    mutationFn: () => serviceCatalogService.restoreSubService(serviceRef, subId),
    onSuccess: (sub) => invalidate(sub.id),
  });
}

export function useSoftDeleteSubService(serviceRef: string, subId: string) {
  const invalidate = useInvalidateSubServices(serviceRef);
  return useMutation({
    mutationFn: () => serviceCatalogService.softDeleteSubService(serviceRef, subId),
    onSuccess: (sub) => invalidate(sub.id),
  });
}

export function useUndeleteSubService(serviceRef: string, subId: string) {
  const invalidate = useInvalidateSubServices(serviceRef);
  return useMutation({
    mutationFn: () => serviceCatalogService.undeleteSubService(serviceRef, subId),
    onSuccess: (sub) => invalidate(sub.id),
  });
}

export function useDuplicateSubService(serviceRef: string) {
  const invalidate = useInvalidateSubServices(serviceRef);
  return useMutation({
    mutationFn: (subId: string) => serviceCatalogService.duplicateSubService(serviceRef, subId),
    onSuccess: (sub) => invalidate(sub.id),
  });
}

export function useReorderSubServices(serviceRef: string) {
  const invalidate = useInvalidateSubServices(serviceRef);
  return useMutation({
    mutationFn: (orderedIds: string[]) => serviceCatalogService.reorderSubServices(serviceRef, orderedIds),
    onSuccess: () => invalidate(),
  });
}

// ── Service Marketing Gallery ───────────────────────────────────────────────

export function useServiceMedia(serviceRef: string | undefined) {
  return useQuery({
    queryKey: queryKeys.services.media(serviceRef ?? ''),
    queryFn: () => serviceCatalogService.listServiceMedia(serviceRef as string),
    enabled: !!serviceRef,
  });
}

export function usePublicServiceMedia(serviceRef: string | undefined) {
  return useQuery({
    queryKey: queryKeys.services.publicMedia(serviceRef ?? ''),
    queryFn: () => serviceCatalogService.listPublicServiceMedia(serviceRef as string),
    enabled: !!serviceRef,
    staleTime: 30_000,
  });
}

function useInvalidateServiceMedia(serviceRef: string) {
  const queryClient = useQueryClient();
  return (mediaId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.services.media(serviceRef) });
    queryClient.invalidateQueries({ queryKey: queryKeys.services.publicMedia(serviceRef) });
    if (mediaId) queryClient.invalidateQueries({ queryKey: queryKeys.timeline('SERVICE_MEDIA', mediaId) });
  };
}

export function useCreateServiceMedia(serviceRef: string) {
  const invalidate = useInvalidateServiceMedia(serviceRef);
  return useMutation({
    mutationFn: (input: CreateServiceMediaInput) => serviceCatalogService.createServiceMedia(serviceRef, input),
    onSuccess: (media) => invalidate(media.id),
  });
}

export function useUpdateServiceMedia(serviceRef: string, mediaId: string) {
  const invalidate = useInvalidateServiceMedia(serviceRef);
  return useMutation({
    mutationFn: (input: UpdateServiceMediaInput) => serviceCatalogService.updateServiceMedia(serviceRef, mediaId, input),
    onSuccess: (media) => invalidate(media.id),
  });
}

export function useSetFeaturedServiceMedia(serviceRef: string, mediaId: string) {
  const invalidate = useInvalidateServiceMedia(serviceRef);
  return useMutation({
    mutationFn: () => serviceCatalogService.setFeaturedServiceMedia(serviceRef, mediaId),
    onSuccess: (media) => invalidate(media.id),
  });
}

export function useReorderServiceMedia(serviceRef: string) {
  const invalidate = useInvalidateServiceMedia(serviceRef);
  return useMutation({
    mutationFn: (orderedIds: string[]) => serviceCatalogService.reorderServiceMedia(serviceRef, orderedIds),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteServiceMedia(serviceRef: string, mediaId: string) {
  const invalidate = useInvalidateServiceMedia(serviceRef);
  return useMutation({
    mutationFn: () => serviceCatalogService.deleteServiceMedia(serviceRef, mediaId),
    onSuccess: () => invalidate(),
  });
}
