import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { messageService, type MessageListParams } from '@/services/messageService';
import { queryKeys } from './keys';

/** Chat threads poll on an interval so new messages from the other party
 *  appear without a manual refresh - Messages is the one surface where
 *  passive staleness is directly user-visible. */
const THREAD_REFETCH_INTERVAL_MS = 15_000;

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.messages.conversations,
    queryFn: () => messageService.listConversations(),
    refetchInterval: THREAD_REFETCH_INTERVAL_MS,
  });
}

export function useMessageThread(clientId: string | undefined, params: MessageListParams = {}) {
  return useQuery({
    queryKey: queryKeys.messages.thread(clientId ?? ''),
    queryFn: () => messageService.listMessages(clientId as string, params),
    enabled: !!clientId,
    refetchInterval: THREAD_REFETCH_INTERVAL_MS,
  });
}

export function useSendMessage(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => messageService.send(clientId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.thread(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations });
    },
  });
}

export function useMarkThreadRead(clientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => messageService.markRead(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.thread(clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations });
    },
  });
}
