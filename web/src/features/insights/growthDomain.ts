/**
 * Pure growth/analytics helpers. Everything here is derived from fields the
 * backend actually returns (GET /vendor/analytics + /analytics/visits); nothing
 * is invented and a missing metric yields `null` so the UI can omit just that
 * card instead of blanking the dashboard (master task Part D).
 */
import { firstNumber, num } from '@/lib/format';
import type { AnalyticsDaily, AnalyticsSummary } from '@/types/analytics';

export interface DailyPoint {
  /** ISO-ish day label, trimmed to 10 chars. */
  day: string;
  orders: number;
  sales: number;
}

/** Normalise the server's `daily` series; rows with no day are dropped. */
export function dailySeries(daily: AnalyticsDaily[] | undefined): DailyPoint[] {
  if (!Array.isArray(daily)) return [];
  return daily
    .map((row) => {
      const day = String(row.date ?? row.day ?? row._id ?? '').slice(0, 10);
      return {
        day,
        orders: firstNumber(row.orders, row.count) ?? 0,
        sales: firstNumber(row.deliveredSales, row.sales) ?? 0,
      };
    })
    .filter((p) => p.day !== '');
}

export interface Rates {
  /** Cancelled / total, as a percentage, or null when there is no denominator. */
  cancellationRate: number | null;
  /** Delivered / total, as a percentage, or null. */
  deliveredRate: number | null;
}

/** Order rates from server counts. Returns null per-metric when it cannot be derived. */
export function orderRates(summary: AnalyticsSummary | undefined): Rates {
  const total = firstNumber(summary?.totalOrders);
  const cancelled = firstNumber(summary?.cancelledOrders);
  const delivered = firstNumber(summary?.deliveredOrders);
  const pct = (part: number | null): number | null =>
    total !== null && total > 0 && part !== null ? Math.round((part / total) * 1000) / 10 : null;
  return { cancellationRate: pct(cancelled), deliveredRate: pct(delivered) };
}

/** The busiest day in the series (by orders), or null when empty. */
export function peakDay(points: DailyPoint[]): DailyPoint | null {
  if (!points.length) return null;
  return points.reduce((best, p) => (p.orders > best.orders ? p : best), points[0]);
}

export interface Trend {
  /** Percentage change of the 2nd half vs the 1st half of the series, or null. */
  changePct: number | null;
  firstHalf: number;
  secondHalf: number;
}

/**
 * Within-period trend: compares the second half of the returned daily series
 * against the first half. This uses ONLY the server's own rows (no fabricated
 * baseline). It is deliberately not presented as a "previous period" delta,
 * because the analytics endpoint takes no previous-window parameter — see
 * BACKEND-GAPS.md. Returns `changePct: null` when the first half is zero or the
 * series is too short to split.
 */
export function withinPeriodTrend(points: DailyPoint[], metric: 'orders' | 'sales'): Trend {
  if (points.length < 4) return { changePct: null, firstHalf: 0, secondHalf: 0 };
  const mid = Math.floor(points.length / 2);
  const first = points.slice(0, mid).reduce((sum, p) => sum + p[metric], 0);
  const second = points.slice(mid).reduce((sum, p) => sum + p[metric], 0);
  const changePct = first > 0 ? Math.round(((second - first) / first) * 1000) / 10 : null;
  return { changePct, firstHalf: first, secondHalf: second };
}

/** `+12.5%` / `-4%` for a KPI delta, or null when there is no valid comparison. */
export function deltaLabel(changePct: number | null): string | null {
  if (changePct === null || !Number.isFinite(changePct)) return null;
  const sign = changePct > 0 ? '+' : '';
  return `${sign}${changePct}%`;
}

/** True when the summary carries at least one real figure worth rendering. */
export function hasSummaryData(summary: AnalyticsSummary | undefined): boolean {
  if (!summary) return false;
  return [
    summary.totalOrders,
    summary.deliveredOrders,
    summary.cancelledOrders,
    summary.deliveredFoodSales,
    summary.averageDeliveredOrderValue,
  ].some((v) => num(v) !== null);
}

export interface Conversion {
  /** orders ÷ menu views, as a percentage, or null when undefined. */
  pct: number;
  /** The denominator actually used, so the UI can state it. */
  denominator: 'views' | 'orders';
}

/**
 * Conversion rate. Definition (documented, never guessed):
 *   conversion = orders ÷ menu views × 100
 * with "orders" being total orders in the period and "menu views" the
 * deduplicated customer views from `/analytics/visits`. It is only computed
 * when the period has at least one recorded view — a 0-view denominator is
 * undefined, so the UI omits the card rather than showing `0%` or `∞`.
 * Falls back to `delivered ÷ total orders` only when no views exist AND there
 * are orders to compare, so the vendor still sees a real ratio.
 */
export function conversionRate(
  totalOrders: number | null,
  totalViews: number | null,
): Conversion | null {
  if (totalViews !== null && totalViews > 0 && totalOrders !== null) {
    return { pct: Math.round((totalOrders / totalViews) * 1000) / 10, denominator: 'views' };
  }
  return null;
}

/**
 * Whether the period shows zero customer views. Used to render the honest
 * "views are not being recorded yet" note — a real zero, never a fabricated
 * number (the customer-side visit beacon is not wired up; see BACKEND-GAPS.md).
 */
export function viewsAreZero(totalViews: number | null): boolean {
  return totalViews === 0;
}
