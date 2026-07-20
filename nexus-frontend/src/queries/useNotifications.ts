import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/queries/keys';
import { notificationService } from '@/services/notificationService';

export function useNotifications(page = 1, pageSize = 20, isRead?: boolean) {
  return useQuery({
    queryKey: queryKeys.notifications.list(page, pageSize, isRead),
    queryFn: () => notificationService.list({ page, pageSize, isRead }),
    staleTime: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
