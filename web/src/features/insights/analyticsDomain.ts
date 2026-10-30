/**
 * Pure helpers for the redesigned Analytics page.
 *
 * HARD RULE: the backend is the single source of truth. Every rate, percentage
 * and comparison on this page is READ from the server response (conversionRate,
 * engagement, *ChangePct). Nothing here recomputes an analytics metric; a
 * missing value stays `null` so the UI omits the tile or shows "Not enough data
 * yet" instead of inventing a 0 (AGENTS.md rule 5).
 *
 * The only arithmetic that lives here is PRESENTATION geometry (SVG arc/path
 * coordinates, bar heights) plus safe coercion of raw payloads into typed rows.
 */
import { formatCompactNumber, formatCount, formatMoney } from '@/lib/format';
import type { AnalyticsResponse, VisitsData, VisitItemRow } from '@/types/analytics';

/**
 * Coerce an optional metric to a finite number, treating `null`, `undefined`
 * and `''` as ABSENT (returns null). The shared `num()` would turn a missing
 * value into a real 0 (`Number(null) === 0`), which is exactly the "fake
 * number" AGENTS.md rule 5 forbids. Every optional metric uses this.
 */
function optNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** First PRESENT number among the candidates (absent = null/undefined/''). */
function firstOpt(...values: unknown[]): number | null {
  for (const value of values) {
    const n = optNum(value);
    if (n !== null) return n;
  }
  return null;
}

/** A finite number or 0 — used only where a series point genuinely defaults to 0. */
function orZero(value: unknown): number {
  return optNum(value) ?? 0;
}

export interface DailyPoint {
  day: string;
  views: number;
  uniqueVisitors: number;
}

export interface OrderDailyPoint {
  date: string;
  orders: number;
  deliveredSales: number;
}

export interface ItemRow {
  id: string;
  name: string;
  views: number | null;
  addToCart: number | null;
  /** Item engagement %, backend-computed. Null when the backend omits it. */
  engagement: number | null;
}

export interface VisitMetrics {
  totalViews: number | null;
  uniqueVisitors: number | null;
  itemViews: number | null;
  addToCart: number | null;
  removeFromCart: number | null;
  checkoutInitiated: number | null;
  completedOrders: number | null;
  cancelledOrders: number | null;
  refunds: number | null;
  conversionRate: number | null;
  revenue: number | null;
  averageOrderValue: number | null;
  attributionWindowHours: number | null;
  daily: DailyPoint[];
  items: ItemRow[];
  comparison: {
    viewsChangePct: number | null;
    uniqueVisitorsChangePct: number | null;
    completedOrdersChangePct: number | null;
    conversionRateChangePct: number | null;
  };
}

export interface OrderMetrics {
  totalOrders: number | null;
  deliveredOrders: number | null;
  cancelledOrders: number | null;
  deliveredFoodSales: number | null;
  averageDeliveredOrderValue: number | null;
  daily: OrderDailyPoint[];
  topItems: { name: string; quantity: number; sales: number }[];
}

export interface AnalyticsModel {
  visits: VisitMetrics;
  orders: OrderMetrics;
}

function unwrap(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const env = raw as Record<string, unknown>;
  const data = env.data && typeof env.data === 'object' ? (env.data as Record<string, unknown>) : env;
  return data;
}

function toItems(raw: unknown): ItemRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, i): ItemRow => {
      const r = (row ?? {}) as VisitItemRow & Record<string, unknown>;
      const name = String(r.name ?? r.itemName ?? '').trim();
      return {
        id: String(r.menuItemId ?? r._id ?? `${name}-${i}`),
        name,
        views: firstOpt(r.views),
        addToCart: firstOpt(r.addToCart, r.adds),
        engagement: firstOpt(r.engagement),
      };
    })
    .filter((r) => r.name !== '');
}

function toVisitDaily(raw: unknown): DailyPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const day = String(r.day ?? r.date ?? '').slice(0, 10);
      return { day, views: orZero(r.views), uniqueVisitors: orZero(r.uniqueVisitors) };
    })
    .filter((d) => d.day !== '');
}

function toOrderDaily(raw: unknown): OrderDailyPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const date = String(r.date ?? r.day ?? r._id ?? '').slice(0, 10);
      return { date, orders: orZero(r.orders ?? r.count), deliveredSales: orZero(r.deliveredSales ?? r.sales) };
    })
    .filter((d) => d.date !== '');
}

/** Normalise the `/analytics/visits` payload. */
export function normalizeVisits(raw: unknown): VisitMetrics {
  const d = unwrap(raw) as VisitsData;
  const s = (d.summary ?? {}) as Record<string, unknown>;
  const c = (d.comparison ?? {}) as Record<string, unknown>;
  const itemsRaw = d.mostViewedItems ?? d.topItems;
  return {
    totalViews: firstOpt(s.totalViews),
    uniqueVisitors: firstOpt(s.uniqueVisitors),
    itemViews: firstOpt(s.itemViews),
    addToCart: firstOpt(s.addToCart),
    removeFromCart: firstOpt(s.removeFromCart),
    checkoutInitiated: firstOpt(s.checkoutInitiated),
    completedOrders: firstOpt(s.completedOrders),
    cancelledOrders: firstOpt(s.cancelledOrders),
    refunds: firstOpt(s.refunds),
    conversionRate: firstOpt(s.conversionRate),
    revenue: firstOpt(s.revenue),
    averageOrderValue: firstOpt(s.averageOrderValue),
    attributionWindowHours: firstOpt((s.attribution as Record<string, unknown> | undefined)?.windowHours),
    daily: toVisitDaily(d.daily),
    items: toItems(itemsRaw),
    comparison: {
      viewsChangePct: firstOpt(c.viewsChangePct),
      uniqueVisitorsChangePct: firstOpt(c.uniqueVisitorsChangePct),
      completedOrdersChangePct: firstOpt(c.completedOrdersChangePct),
      conversionRateChangePct: firstOpt(c.conversionRateChangePct),
    },
  };
}

/** Normalise the `/analytics` (order-side) payload. */
export function normalizeOrders(raw: unknown): OrderMetrics {
  const d = unwrap(raw) as AnalyticsResponse;
  const s = (d.summary ?? {}) as Record<string, unknown>;
  const top = Array.isArray(d.topItems) ? d.topItems : [];
  return {
    totalOrders: firstOpt(s.totalOrders),
    deliveredOrders: firstOpt(s.deliveredOrders),
    cancelledOrders: firstOpt(s.cancelledOrders),
    deliveredFoodSales: firstOpt(s.deliveredFoodSales),
    averageDeliveredOrderValue: firstOpt(s.averageDeliveredOrderValue),
    daily: toOrderDaily(d.daily),
    topItems: top
      .map((row) => {
        const r = (row ?? {}) as Record<string, unknown>;
        return {
          name: String(r.name ?? r.itemName ?? '').trim(),
          quantity: orZero(r.quantity ?? r.count),
          sales: orZero(r.sales),
        };
      })
      .filter((r) => r.name !== ''),
  };
}

export function normalizeAnalytics(ordersRaw: unknown, visitsRaw: unknown): AnalyticsModel {
  return { orders: normalizeOrders(ordersRaw), visits: normalizeVisits(visitsRaw) };
}

export type KpiKey =
  | 'views'
  | 'visitors'
  | 'addToCart'
  | 'completed'
  | 'conversion'
  | 'cancelled'
  | 'revenue';

export interface KpiMetric {
  key: KpiKey;
  label: string;
  /** Formatted face value, or null (renders the empty label). */
  value: string | null;
  /** Full, un-abbreviated value for the tooltip / title. */
  full: string | null;
  /** Signed change % as returned by the backend, or null when not provided. */
  deltaPct: number | null;
  /** True when a DECREASE is good (cancellations). */
  invert: boolean;
  /** Plain-language formula, matching the backend definition. */
  formula: string;
  /** Optional per-day series for a KPI sparkline. */
  spark: number[];
}

const EMPTY_LABEL = 'Not enough data yet';

/**
 * The KPI row. Values are read from the visit analytics first and fall back to
 * the order analytics; a metric the backend did not send stays null so the card
 * shows "Not enough data yet" rather than a fabricated 0.
 */
export function buildKpis(model: AnalyticsModel): KpiMetric[] {
  const { visits: v, orders: o } = model;

  const completed = v.completedOrders ?? o.deliveredOrders;
  const cancelled = v.cancelledOrders ?? o.cancelledOrders;
  const revenue = v.revenue ?? o.deliveredFoodSales;

  const viewsSpark = v.daily.map((d) => d.views);
  const visitorsSpark = v.daily.map((d) => d.uniqueVisitors);
  const orderSpark = o.daily.map((d) => d.orders);

  const count = (n: number | null): { value: string | null; full: string | null } =>
    n === null
      ? { value: null, full: null }
      : { value: formatCompactNumber(n), full: formatCount(n) };

  const money = (n: number | null): { value: string | null; full: string | null } =>
    n === null ? { value: null, full: null } : { value: formatMoney(n), full: formatMoney(n) };

  const pct = (n: number | null): { value: string | null; full: string | null } =>
    n === null ? { value: null, full: null } : { value: `${n}%`, full: `${n}%` };

  return [
    {
      key: 'views',
      label: 'Menu views',
      ...count(v.totalViews),
      deltaPct: v.comparison.viewsChangePct,
      invert: false,
      formula: 'Customer menu opens (restaurant_view + menu_view) in the selected period.',
      spark: viewsSpark,
    },
    {
      key: 'visitors',
      label: 'Unique visitors',
      ...count(v.uniqueVisitors),
      deltaPct: v.comparison.uniqueVisitorsChangePct,
      invert: false,
      formula:
        'Distinct visitors who opened your menu in the period. Repeat opens within the dedupe window count once.',
      spark: visitorsSpark,
    },
    {
      key: 'addToCart',
      label: 'Add-to-cart events',
      ...count(v.addToCart),
      deltaPct: null,
      invert: false,
      formula: 'Times customers added an item from your menu to the cart in the period.',
      spark: [],
    },
    {
      key: 'completed',
      label: 'Completed orders',
      ...count(completed),
      deltaPct: v.comparison.completedOrdersChangePct,
      invert: false,
      formula: 'Orders attributed to your menu that were completed in the period.',
      spark: orderSpark,
    },
    {
      key: 'conversion',
      label: 'Conversion rate',
      ...pct(v.conversionRate),
      deltaPct: v.comparison.conversionRateChangePct,
      invert: false,
      formula: 'Completed attributed orders ÷ unique menu visitors × 100.',
      spark: [],
    },
    {
      key: 'cancelled',
      label: 'Cancelled orders',
      ...count(cancelled),
      deltaPct: null,
      invert: true,
      formula: 'Orders attributed to your menu that were cancelled in the period. Lower is better.',
      spark: [],
    },
    {
      key: 'revenue',
      label: 'Revenue',
      ...money(revenue),
      deltaPct: null,
      invert: false,
      formula: 'Delivered order value for your restaurant in the period (calculated by Eatswada).',
      spark: [],
    },
  ];
}

export const EMPTY_METRIC_LABEL = EMPTY_LABEL;

export interface FunnelStep {
  key: string;
  label: string;
  value: number | null;
  /** Formula/definition shown in the step tooltip. */
  formula: string;
}

/**
 * Conversion funnel. Step COUNTS come straight from the backend; no drop-off
 * percentage is computed here because the backend does not return one (the UI
 * must not invent a rate).
 */
export function buildFunnel(model: AnalyticsModel): FunnelStep[] {
  const v = model.visits;
  return [
    { key: 'visits', label: 'Menu visits', value: v.totalViews, formula: 'Menu opens in the period.' },
    { key: 'itemViews', label: 'Item views', value: v.itemViews, formula: 'Menu items opened.' },
    { key: 'addToCart', label: 'Added to cart', value: v.addToCart, formula: 'Items added to the cart.' },
    {
      key: 'checkout',
      label: 'Checkout started',
      value: v.checkoutInitiated,
      formula: 'Checkouts initiated from the menu.',
    },
    {
      key: 'completed',
      label: 'Orders completed',
      value: v.completedOrders,
      formula: 'Completed attributed orders.',
    },
  ];
}

/** True when every funnel step is a real zero (the beacon records nothing yet). */
export function funnelIsAllZero(steps: FunnelStep[]): boolean {
  return steps.every((s) => s.value === null || s.value === 0);
}

export interface FunnelRow extends FunnelStep {
  /** Bar width % relative to the widest step — presentation only, not a metric. */
  widthPct: number;
}

/** Attach a proportional bar width (relative to the first non-zero step). */
export function funnelRows(steps: FunnelStep[]): FunnelRow[] {
  const values = steps.map((s) => s.value ?? 0);
  const max = Math.max(0, ...values);
  return steps.map((s) => ({
    ...s,
    widthPct: max > 0 ? Math.round(((s.value ?? 0) / max) * 100) : 0,
  }));
}

export interface OrderBreakdown {
  completed: number | null;
  cancelled: number | null;
  refunds: number | null;
  revenue: number | null;
}

/** Orders panel figures, read from the visit analytics with an order-side fallback. */
export function orderBreakdown(model: AnalyticsModel): OrderBreakdown {
  return {
    completed: model.visits.completedOrders ?? model.orders.deliveredOrders,
    cancelled: model.visits.cancelledOrders ?? model.orders.cancelledOrders,
    refunds: model.visits.refunds,
    revenue: model.visits.revenue ?? model.orders.deliveredFoodSales,
  };
}

/** A `+12.5%` / `-4%` label for a KPI delta, or null when there is no baseline. */
export function deltaLabel(changePct: number | null): string | null {
  if (changePct === null || !Number.isFinite(changePct)) return null;
  const sign = changePct > 0 ? '+' : '';
  return `${sign}${changePct}%`;
}

// ── Presentation geometry (not analytics) ───────────────────────────────

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  pct: number;
  dash: number;
  offset: number;
  colorVar: string;
  radius: number;
}

const DONUT_COLORS = ['--es-brand-ink', '--es-info-ink', '--es-success-ink', '--es-star'];

/** Donut geometry for inline SVG. Empty (no arcs) when the total is zero. */
export function donutSegments(
  rows: { key: string; label: string; value: number }[],
  radius = 40,
): DonutSegment[] {
  const total = rows.reduce((sum, r) => sum + (Number.isFinite(r.value) ? r.value : 0), 0);
  if (total <= 0) return [];
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return rows.map((r, i) => {
    const pct = (r.value / total) * 100;
    const dash = (r.value / total) * circumference;
    const seg: DonutSegment = {
      key: r.key,
      label: r.label,
      value: r.value,
      pct: Math.round(pct * 10) / 10,
      dash,
      offset,
      colorVar: DONUT_COLORS[i % DONUT_COLORS.length],
      radius,
    };
    offset += dash;
    return seg;
  });
}

/**
 * Inline SVG sparkline path across a `width` x `height` box. Returns '' for
 * fewer than two points; a flat series is centred rather than dividing by zero.
 */
export function sparklinePath(values: number[], width = 100, height = 20): string {
  if (!Array.isArray(values) || values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const stepX = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = span === 0 ? height / 2 : height - ((v - min) / span) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}
