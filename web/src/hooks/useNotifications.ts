import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { fetchNotifications, markNotificationRead } from '@/services/api/notifications';

/** The vendor's notifications. Polls on the same 30 s cadence as other lists. */
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: fetchNotifications,
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}
