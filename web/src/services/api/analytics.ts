/**
 * Analytics endpoint module. Paths exist in VENDOR-API-CONTRACT.md
 * (`GET /vendor/analytics`, `GET /vendor/analytics/visits`).
 */
import { apiFetch } from '@/lib/api';
import type { AnalyticsResponse, VisitsResponse } from '@/types/analytics';

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all';

export async function fetchAnalytics(period: AnalyticsPeriod): Promise<AnalyticsResponse> {
  return apiFetch<AnalyticsResponse>(`/analytics?period=${encodeURIComponent(period)}`);
}

/**
 * Menu-view analytics. Optional: the beacon may not have recorded anything yet,
 * so a failure here must not fail the whole Insights screen (mirrors the legacy
 * `.catch(() => null)`).
 */
export async function fetchVisits(period: AnalyticsPeriod): Promise<VisitsResponse | null> {
  try {
    return await apiFetch<VisitsResponse>(`/analytics/visits?period=${encodeURIComponent(period)}`);
  } catch {
    return null;
  }
}
