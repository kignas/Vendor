import { useQuery } from '@tanstack/react-query';
import { fetchActivity, fetchAlerts, fetchDashboard } from '@/services/api/home';

/**
 * Compact dashboard summary. Short stale time so the daily figures stay fresh
 * without hammering the API; the live queue is a separate, faster query.
 */
export function useDashboard() {
  return useQuery({
    queryKey: ['home', 'dashboard'] as const,
    queryFn: fetchDashboard,
    staleTime: 60_000,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ['home', 'alerts'] as const,
    queryFn: fetchAlerts,
    staleTime: 60_000,
  });
}

export function useActivity(limit = 8) {
  return useQuery({
    queryKey: ['home', 'activity', limit] as const,
    queryFn: () => fetchActivity(limit),
    staleTime: 60_000,
  });
}
