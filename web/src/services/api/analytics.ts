/**
 * Analytics endpoint module. Paths exist in VENDOR-API-CONTRACT.md
 * (`GET /vendor/analytics`, `GET /vendor/analytics/visits`).
 *
 * Both routes answer with the standard vendor envelope
 * `{ success: true, data: { … } }`. The service unwraps `.data` here so every
 * consumer reads the same flat shape the backend documents — the earlier port
 * left the envelope in place, so `InsightsPage` looked for `summary` one level
 * too high and rendered zero for every sales/order KPI. See
 * docs/rebuild/ANALYTICS_ROOT_CAUSE.md.
 */
import { apiFetch } from '@/lib/api';
import type { AnalyticsResponse, VisitsResponse } from '@/types/analytics';

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all';

interface AnalyticsEnvelope {
  data?: AnalyticsResponse;
}

/** Sales/order analytics for a period. Returns the unwrapped `data` block. */
export async function fetchAnalytics(period: AnalyticsPeriod): Promise<AnalyticsResponse> {
  const res = await apiFetch<AnalyticsEnvelope & AnalyticsResponse>(
    `/analytics?period=${encodeURIComponent(period)}`,
  );
  // Tolerate both shapes: the real envelope (res.data) and a flat payload, so a
  // backend change or a legacy mirror cannot silently zero the dashboard again.
  return res?.data ?? (res as AnalyticsResponse) ?? {};
}

interface VisitsEnvelope {
  data?: VisitsResponse['data'];
}

/**
 * Menu-view analytics. Optional: the beacon may not have recorded anything yet,
 * so a failure here must not fail the whole Insights screen (mirrors the legacy
 * `.catch(() => null)`). Returns the unwrapped `data` block.
 */
export async function fetchVisits(period: AnalyticsPeriod): Promise<VisitsResponse['data'] | null> {
  try {
    const res = await apiFetch<VisitsEnvelope>(
      `/analytics/visits?period=${encodeURIComponent(period)}`,
    );
    return res?.data ?? null;
  } catch {
    return null;
  }
}
