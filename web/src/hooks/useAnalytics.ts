import { useQuery } from '@tanstack/react-query';
import { fetchAnalyticsOverview, type AnalyticsPeriod } from '@/services/api/analytics';

/**
 * Aggregated analytics for the redesigned page: prefers the single
 * `/analytics/overview` endpoint and transparently falls back to composing the
 * legacy endpoints. `data.raw` is normalised by `normalizeOverview`.
 */
export function useAnalyticsOverview(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ['analytics', 'overview', period] as const,
    queryFn: () => fetchAnalyticsOverview(period),
    staleTime: 60_000,
  });
}
