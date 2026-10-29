import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { fetchHistory, fetchQueue } from '@/services/api/orders';

/**
 * Live order queue. The backend returns the full queue (no server pagination
 * for the live view), so a short refresh interval keeps the kitchen current
 * without ever losing an active order behind a page boundary. Mirrors the
 * legacy 15 s poll in config.js.
 */
export function useOrderQueue() {
  return useQuery({
    queryKey: queryKeys.orders('queue'),
    queryFn: fetchQueue,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

/** Paginated order history. Only the history view paginates server-side. */
export function useOrderHistory(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['orders', 'history'],
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchHistory(pageParam, 20),
    getNextPageParam: (last) =>
      last.currentPage < last.totalPages ? last.currentPage + 1 : undefined,
  });
}
