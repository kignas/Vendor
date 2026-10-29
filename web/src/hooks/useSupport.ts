import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { createTicket, fetchSupportTickets, replyToTicket, type CreateTicketInput } from '@/services/api/support';

/** Support ticket list. Tickets change slowly; a 30 s stale time is plenty. */
export function useSupportTickets() {
  return useQuery({
    queryKey: queryKeys.support,
    queryFn: fetchSupportTickets,
    staleTime: 30_000,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => createTicket(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.support });
    },
  });
}

export function useReplyToTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => replyToTicket(id, message),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.support });
    },
  });
}
