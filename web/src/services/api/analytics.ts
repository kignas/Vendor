/**
 * Analytics endpoint module. Uses ONLY routes confirmed in
 * VENDOR-API-CONTRACT.md / docs/rebuild/ANALYTICS_REDESIGN_AUDIT.md:
 *
 *   GET /vendor/analytics?period=          -> { success, data: {...} }
 *   GET /vendor/analytics/visits?period=   -> { success, data: {...} }
 *
 * The invented `GET /vendor/analytics/overview` route the previous version
 * depended on does not exist on the backend (audit defect D1); it is gone.
 *
 * Both real routes answer with the standard vendor envelope `{ success, data }`.
 * The service unwraps `.data` here so every consumer reads the flat shape the
 * backend documents. `fetchVisits` never throws: menu views are a true zero
 * until the customer beacon ships (BACKEND_GAPS §11), so a failure there must
 * not blank the whole screen.
 */
import { apiFetch } from '@/lib/api';
import type { AnalyticsResponse, VisitsData } from '@/types/analytics';

export type AnalyticsPeriod = 'today' | '7d' | '30d' | '90d' | 'all';

interface AnalyticsEnvelope {
  data?: AnalyticsResponse;
}

/** Sales/order analytics for a period. Returns the unwrapped `data` block. */
export async function fetchAnalytics(period: AnalyticsPeriod): Promise<AnalyticsResponse> {
  const res = await apiFetch<AnalyticsEnvelope & AnalyticsResponse>(
    `/analytics?period=${encodeURIComponent(period)}`,
  );
  // Tolerate both shapes: the real envelope (res.data) and a flat payload, so a
  // backend change or a legacy mirror cannot silently zero the dashboard.
  return res?.data ?? (res as AnalyticsResponse) ?? {};
}

interface VisitsEnvelope {
  data?: VisitsData;
}

/**
 * Menu-view / funnel analytics. Optional: a failure here returns null so the
 * page keeps rendering the order-side widgets (mirrors the legacy
 * `.catch(() => null)`). Returns the unwrapped `data` block.
 */
export async function fetchVisits(period: AnalyticsPeriod): Promise<VisitsData | null> {
  try {
    const res = await apiFetch<VisitsEnvelope & VisitsData>(
      `/analytics/visits?period=${encodeURIComponent(period)}`,
    );
    return res?.data ?? (res as VisitsData) ?? null;
  } catch {
    return null;
  }
}
