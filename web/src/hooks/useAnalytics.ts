import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { fetchAnalytics, fetchVisits, type AnalyticsPeriod } from '@/services/api/analytics';

/** Sales/order analytics for a period. Mirrors legacy `loadAnalytics`. */
export function useAnalytics(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: queryKeys.analytics(period),
    queryFn: () => fetchAnalytics(period),
    staleTime: 60_000,
  });
}

/** Menu-view analytics for a period (best-effort; null when unavailable). */
export function useVisitAnalytics(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ['analytics', 'visits', period] as const,
    queryFn: () => fetchVisits(period),
    staleTime: 60_000,
  });
}
