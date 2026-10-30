import { useQuery } from '@tanstack/react-query';
import { fetchPerformance } from '@/services/api/performance';

/**
 * The vendor's OWN restaurant performance score + ranking factors
 * (`GET /vendor/performance`, read-only). Scoped server-side to the caller's
 * restaurant, so no id is ever sent.
 */
export function usePerformance() {
  return useQuery({
    queryKey: ['performance'] as const,
    queryFn: fetchPerformance,
    staleTime: 60_000,
  });
}
