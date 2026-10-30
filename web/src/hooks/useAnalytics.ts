import { useQuery } from '@tanstack/react-query';
import {
  fetchAnalytics,
  fetchVisits,
  type AnalyticsPeriod,
} from '@/services/api/analytics';

/**
 * Order-side analytics (`GET /vendor/analytics`). A failure here is a real
 * error (the sales/order figures are authoritative), so the page shows a
 * retryable error state for the order widgets only.
 */
export function useAnalytics(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ['analytics', 'orders', period] as const,
    queryFn: () => fetchAnalytics(period),
    staleTime: 60_000,
  });
}

/**
 * Visit/funnel analytics (`GET /vendor/analytics/visits`). The service returns
 * `null` instead of throwing when the route fails, so this query never errors —
 * the traffic widgets simply render their own empty/"not recorded yet" state.
 */
export function useVisits(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ['analytics', 'visits', period] as const,
    queryFn: () => fetchVisits(period),
    staleTime: 60_000,
  });
}
