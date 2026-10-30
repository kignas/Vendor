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

/**
 * Aggregated analytics for the redesigned Analytics page.
 *
 * Primary source is `GET /vendor/analytics/overview?period=` — ONE aggregated
 * endpoint returning current + previous totals, a daily series, mixes, top and
 * worst items and peak hours (see docs/rebuild/ANALYTICS_BACKEND.md for the
 * exact contract and the required `restaurant + createdAt` index).
 *
 * While that route is not yet deployed the call 404s, so we fall back to
 * composing from the two endpoints that DO exist (`/analytics` +
 * `/analytics/visits`). The fallback fills only the blocks those endpoints can
 * actually provide; the rest stays empty and the UI omits it rather than
 * inventing a number (AGENTS.md rule 5). Returns `{ source }` so the page can
 * say which endpoint answered.
 */
export async function fetchAnalyticsOverview(
  period: AnalyticsPeriod,
): Promise<{ raw: unknown; source: 'overview' | 'composed' }> {
  try {
    const res = await apiFetch<Record<string, unknown>>(
      `/analytics/overview?period=${encodeURIComponent(period)}`,
    );
    return { raw: res?.data ?? res, source: 'overview' };
  } catch {
    const [sales, visits] = await Promise.all([fetchAnalytics(period), fetchVisits(period)]);
    return { raw: composeOverview(sales, visits), source: 'composed' };
  }
}

interface ComposedOverview {
  period?: string;
  current: Record<string, unknown>;
  daily: unknown;
  topItems: unknown;
  visits?: { totalViews: number; uniqueVisitors: number } | null;
}

/**
 * Best-effort reshape of the legacy `/analytics` + `/analytics/visits` payloads
 * into the aggregated `overview` shape. Deliberately does NOT fabricate
 * `previous`, `paymentMix`, `dietMix`, `worstItems` or `peakHours` — those
 * require the overview endpoint.
 */
function composeOverview(
  sales: AnalyticsResponse,
  visits: VisitsResponse['data'] | null,
): ComposedOverview {
  const out: ComposedOverview = {
    current: (sales.summary ?? {}) as Record<string, unknown>,
    daily: sales.daily ?? [],
    topItems: sales.topItems ?? [],
  };
  if (typeof sales.period === 'string') out.period = sales.period;
  if (visits?.summary) {
    out.visits = {
      totalViews: Number(visits.summary.totalViews ?? 0),
      uniqueVisitors: Number(visits.summary.uniqueVisitors ?? 0),
    };
  }
  return out;
}
