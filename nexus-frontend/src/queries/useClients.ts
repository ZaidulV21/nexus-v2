import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientService, type ClientListParams, type UpdateClientInput } from '@/services/clientService';
import { queryKeys } from './keys';

export function useClientsList(params: ClientListParams) {
  return useQuery({
    queryKey: queryKeys.clients.list(params),
    queryFn: () => clientService.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id ?? ''),
    queryFn: () => clientService.getById(id as string),
    enabled: !!id,
  });
}

export function useClientSummary(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.summary(id ?? ''),
    queryFn: () => clientService.getSummary(id as string),
    enabled: !!id,
  });
}

export function useClientLeads(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.leads(clientId ?? ''),
    queryFn: () => clientService.getLeads(clientId as string),
    enabled: !!clientId,
  });
}

export function useClientServices(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.services(clientId ?? ''),
    queryFn: () => clientService.getServices(clientId as string),
    enabled: !!clientId,
  });
}

export function useUpdateClient(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateClientInput) => clientService.update(clientId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}

export function useResetClientPassword(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clientService.resetPassword(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
    },
  });
}

export function useSendClientWelcomeEmail(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clientService.sendWelcomeEmail(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
    },
  });
}

export function useToggleClientActive(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) => clientService.toggleActive(clientId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}
