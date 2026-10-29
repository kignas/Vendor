import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { fetchReviews, replyToReview } from '@/services/api/reviews';

/** Vendor reviews list. Reviews change slowly, so a 60 s stale time is plenty. */
export function useReviews() {
  return useQuery({
    queryKey: queryKeys.reviews,
    queryFn: () => fetchReviews(1, 50),
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
