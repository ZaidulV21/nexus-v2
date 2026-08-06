import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  projectService,
  type CreateProjectMediaInput,
  type ProjectListParams,
  type UpdateProjectMediaInput,
  type UpdateProjectServiceStatusInput,
} from '@/services/projectService';
import { queryKeys } from './keys';

export function useProjectsList(params: ProjectListParams) {
  return useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: () => projectService.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id ?? ''),
    queryFn: () => projectService.getById(id as string),
    enabled: !!id,
  });
}

/** Client-portal: the authenticated client's own projects. */
export function useMyProjects() {
  return useQuery({
    queryKey: queryKeys.projects.clientList,
    queryFn: () => projectService.listMine(),
  });
}

export function useMyProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.clientDetail(id ?? ''),
    queryFn: () => projectService.getMine(id as string),
    enabled: !!id,
  });
}

export function useUpdateProjectServiceStatus(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectServiceId,
      input,
    }: {
      projectServiceId: string;
      input: UpdateProjectServiceStatusInput;
    }) => projectService.updateServiceStatus(projectServiceId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.timeline('PROJECT_SERVICE', variables.projectServiceId),
      });
    },
  });
}

export function useProjectInvoices(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.invoices(projectId ?? ''),
    queryFn: () => projectService.listInvoices(projectId as string),
    enabled: !!projectId,
  });
}

export function useProjectFinancialSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.financialSummary(projectId ?? ''),
    queryFn: () => projectService.getFinancialSummary(projectId as string),
    enabled: !!projectId,
  });
}

export function useProjectDocuments(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.documents(projectId ?? ''),
    queryFn: () => projectService.listDocuments(projectId as string),
    enabled: !!projectId,
  });
}

/** Admin: all completion media for a project (portfolio gallery). */
export function useProjectMedia(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.media(projectId ?? ''),
    queryFn: () => projectService.listProjectMedia(projectId as string),
    enabled: !!projectId,
  });
}

// Every mutation that changes a project's completion state must refresh the
// project detail + the public portfolio, which feeds off the same data.
function useInvalidateProjectAndPortfolio(projectId: string) {
  const queryClient = useQueryClient();
  return (mediaId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.media(projectId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.portfolio.all });
    if (mediaId) queryClient.invalidateQueries({ queryKey: queryKeys.timeline('PROJECT_MEDIA', mediaId) });
  };
}

export function useMarkProjectComplete(projectId: string) {
  const invalidate = useInvalidateProjectAndPortfolio(projectId);
  return useMutation({
    mutationFn: () => projectService.complete(projectId),
    onSuccess: () => invalidate(),
    onError: () => invalidate(),
  });
}

export function useUpdateProjectTitle(projectId: string) {
  const invalidate = useInvalidateProjectAndPortfolio(projectId);
  return useMutation({
    mutationFn: (title: string) => projectService.updateTitle(projectId, title),
    onSuccess: () => invalidate(),
  });
}

export function useCreateProjectMedia(projectId: string) {
  const invalidate = useInvalidateProjectAndPortfolio(projectId);
  return useMutation({
    mutationFn: (input: CreateProjectMediaInput) => projectService.createProjectMedia(projectId, input),
    onSuccess: (media) => invalidate(media.id),
  });
}

export function useUpdateProjectMedia(projectId: string, mediaId: string) {
  const invalidate = useInvalidateProjectAndPortfolio(projectId);
  return useMutation({
    mutationFn: (input: UpdateProjectMediaInput) => projectService.updateProjectMedia(projectId, mediaId, input),
    onSuccess: (media) => invalidate(media.id),
  });
}

export function useSetFeaturedProjectMedia(projectId: string, mediaId: string) {
  const invalidate = useInvalidateProjectAndPortfolio(projectId);
  return useMutation({
    mutationFn: () => projectService.setFeaturedProjectMedia(projectId, mediaId),
    onSuccess: (media) => invalidate(media.id),
  });
}

export function useReorderProjectMedia(projectId: string) {
  const invalidate = useInvalidateProjectAndPortfolio(projectId);
  return useMutation({
    mutationFn: (orderedIds: string[]) => projectService.reorderProjectMedia(projectId, orderedIds),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteProjectMedia(projectId: string, mediaId: string) {
  const invalidate = useInvalidateProjectAndPortfolio(projectId);
  return useMutation({
    mutationFn: () => projectService.deleteProjectMedia(projectId, mediaId),
    onSuccess: () => invalidate(mediaId),
  });
}
