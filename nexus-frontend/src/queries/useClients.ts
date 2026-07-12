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
