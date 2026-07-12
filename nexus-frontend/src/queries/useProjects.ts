import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  projectService,
  type ProjectListParams,
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
