import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contactService, type ContactMessageListParams } from '@/services/contactService';
import { queryKeys } from '@/queries/keys';

function useInvalidateContact() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.contact.all });
  };
}

export function useContactMessagesList(params: ContactMessageListParams) {
  return useQuery({
    queryKey: queryKeys.contact.list(params),
    queryFn: () => contactService.list(params),
  });
}

export function useContactMessageCounts() {
  return useQuery({
    queryKey: queryKeys.contact.counts,
    queryFn: () => contactService.counts(),
  });
}

export function useSubmitContactMessage() {
  return useMutation({
    mutationFn: (input: Parameters<typeof contactService.submit>[0]) => contactService.submit(input),
  });
}

export function useMarkContactMessageRead(id: string) {
  const invalidate = useInvalidateContact();
  return useMutation({
    mutationFn: () => contactService.markRead(id),
    onSuccess: invalidate,
  });
}

export function useReplyContactMessage(id: string) {
  const invalidate = useInvalidateContact();
  return useMutation({
    mutationFn: (body: string) => contactService.reply(id, body),
    onSuccess: invalidate,
  });
}

export function useArchiveContactMessage(id: string) {
  const invalidate = useInvalidateContact();
  return useMutation({
    mutationFn: () => contactService.archive(id),
    onSuccess: invalidate,
  });
}

export function useRestoreContactMessage(id: string) {
  const invalidate = useInvalidateContact();
  return useMutation({
    mutationFn: () => contactService.restore(id),
    onSuccess: invalidate,
  });
}
