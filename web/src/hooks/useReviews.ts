import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { fetchReviews, replyToReview } from '@/services/api/reviews';

/**
 * Vendor reviews list, paged. Reviews change slowly, so a 60 s stale time is
 * plenty; "Load more" pulls the next server page.
 */
export function useReviews() {
  return useInfiniteQuery({
    queryKey: queryKeys.reviews,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchReviews(pageParam, 20),
    getNextPageParam: (last) =>
      last.currentPage < last.totalPages ? last.currentPage + 1 : undefined,
    staleTime: 60_000,
  });
}

/** Post a reply, then refetch so the server's stored reply is the source of truth. */
export function useReplyToReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => replyToReview(id, message),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
    },
  });
}
