/**
 * Pure analytics helpers for the redesigned Analytics page. Everything is
 * derived from fields the aggregated endpoint actually returns; a missing
 * metric yields `null` so the UI omits just that tile instead of zero-filling
 * (AGENTS.md rule 5). No chart library — the geometry here feeds inline SVG.
 */


/**
 * Coerce an optional metric to a finite number, treating `null`, `undefined`
 * and `''` as ABSENT (returns null). `Number(null)` is 0, so the shared `num()`
 * would silently turn a missing value into a real zero — which is exactly the
 * "fake number" AGENTS.md rule 5 forbids. Every optional metric uses this.
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

export interface OverviewSummary {
  totalOrders: number | null;
  sales: number | null;
  averageOrderValue: number | null;
  cancelledOrders: number | null;
}

export interface OverviewDaily {
  date: string;
  orders: number;
  sales: number;
}

export interface MixRow {
  key: string;
  label: string;
  orders: number;
  amount?: number;
}

export interface DietRow {
  key: string;
  label: string;
  orders: number;
}

export interface ItemRow {
  name: string;
  quantity: number;
  sales: number;
  spark: number[];
}

export interface PeakHour {
  hour: number;
  orders: number;
}

export interface Overview {
  period: string | null;
  current: OverviewSummary;
  previous: OverviewSummary;
  daily: OverviewDaily[];
  paymentMix: MixRow[];
  dietMix: DietRow[];
  topItems: ItemRow[];
  worstItems: ItemRow[];
  peakHours: PeakHour[];
  visits: { totalViews: number; uniqueVisitors: number } | null;
}

const EMPTY_SUMMARY: OverviewSummary = {
  totalOrders: null,
  sales: null,
  averageOrderValue: null,
  cancelledOrders: null,
};

function toSummary(raw: unknown): OverviewSummary {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_SUMMARY };
  const s = raw as Record<string, unknown>;
  return {
    totalOrders: firstOpt(s.totalOrders, s.orders),
    sales: firstOpt(s.sales, s.deliveredFoodSales, s.totalSales),
    averageOrderValue: firstOpt(s.averageOrderValue, s.averageDeliveredOrderValue, s.avgOrderValue),
    cancelledOrders: firstOpt(s.cancelledOrders, s.cancelled),
  };
}

function toDaily(raw: unknown): OverviewDaily[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const date = String(r.date ?? r.day ?? r._id ?? '').slice(0, 10);
      return {
        date,
        orders: firstOpt(r.orders, r.count) ?? 0,
        sales: firstOpt(r.sales, r.deliveredSales) ?? 0,
      };
    })
    .filter((d) => d.date !== '');
}

function toItems(raw: unknown): ItemRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const name = String(r.name ?? r.itemName ?? r._id ?? '').trim();
      return {
        name,
        quantity: firstOpt(r.quantity, r.count, r.orders) ?? 0,
        sales: firstOpt(r.sales, r.amount) ?? 0,
        spark: Array.isArray(r.spark) ? (r.spark as unknown[]).map((v) => optNum(v) ?? 0) : [],
      };
    })
    .filter((i) => i.name !== '');
}

function toPeakHours(raw: unknown): PeakHour[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const hour = firstOpt(r.hour, r._id);
      return { hour: hour ?? -1, orders: firstOpt(r.orders, r.count) ?? 0 };
    })
    .filter((p) => p.hour >= 0 && p.hour <= 23);
}

/** The payment-method aliases the backend may use, mapped to a stable key. */
function paymentKey(raw: unknown): 'online' | 'cod' | null {
  const v = String(raw ?? '').toLowerCase();
  if (!v) return null;
  if (['online', 'upi', 'card', 'prepaid', 'paid', 'razorpay'].includes(v)) return 'online';
  if (['cod', 'cash', 'cash_on_delivery', 'cashondelivery'].includes(v)) return 'cod';
  return null;
}

export function paymentMixFrom(raw: unknown): MixRow[] {
  if (!Array.isArray(raw)) return [];
  const out: MixRow[] = [];
  for (const row of raw) {
    const r = (row ?? {}) as Record<string, unknown>;
    const key = paymentKey(r.method ?? r.paymentMethod ?? r.paymentMode ?? r._id ?? r.key);
    const orders = firstOpt(r.orders, r.count);
    if (!key || orders === null) continue;
    out.push({
      key,
      label: key === 'online' ? 'Online payment' : 'Cash on delivery',
      orders,
      ...(firstOpt(r.amount, r.total, r.sales) !== null
        ? { amount: firstOpt(r.amount, r.total, r.sales) as number }
        : {}),
    });
  }
  return out;
}

export function dietMixFrom(raw: unknown): DietRow[] {
  if (!Array.isArray(raw)) return [];
  const out: DietRow[] = [];
  for (const row of raw) {
    const r = (row ?? {}) as Record<string, unknown>;
    const rawType = String(r.type ?? r.diet ?? r.key ?? r._id ?? '').toLowerCase();
    const isVeg = ['veg', 'vegetarian', 'true'].includes(rawType);
    const isNonVeg = ['non_veg', 'nonveg', 'non-veg', 'false'].includes(rawType);
    const orders = firstOpt(r.orders, r.count);
    if ((!isVeg && !isNonVeg) || orders === null) continue;
    out.push({
      key: isVeg ? 'veg' : 'non_veg',
      label: isVeg ? 'Veg' : 'Non-veg',
      orders,
    });
  }
  return out;
}

/**
 * Normalise the aggregated analytics envelope. Tolerates the real
 * `{ success, data }` wrapper and a flat payload, and fills every block with a
 * safe empty default so the page never reads `undefined`.
 */
export function normalizeOverview(raw: unknown): Overview {
  const env = (raw ?? {}) as Record<string, unknown>;
  const data = (env.data && typeof env.data === 'object' ? env.data : env) as Record<string, unknown>;
  const visitsRaw = data.visits ?? env.visits;
  const visits =
    visitsRaw && typeof visitsRaw === 'object'
      ? {
          totalViews: firstOpt((visitsRaw as Record<string, unknown>).totalViews) ?? 0,
          uniqueVisitors: firstOpt((visitsRaw as Record<string, unknown>).uniqueVisitors) ?? 0,
        }
      : null;
  return {
    period: typeof data.period === 'string' ? data.period : null,
    current: toSummary(data.current ?? data.summary),
    previous: toSummary(data.previous),
    daily: toDaily(data.daily),
    paymentMix: paymentMixFrom(data.paymentMix),
    dietMix: dietMixFrom(data.dietMix),
    topItems: toItems(data.topItems),
    worstItems: toItems(data.worstItems),
    peakHours: toPeakHours(data.peakHours),
    visits,
  };
}

/** Signed percentage change vs the previous period, or null without a baseline. */
export function percentChange(current: unknown, previous: unknown): number | null {
  const c = optNum(current);
  const p = optNum(previous);
  if (c === null || p === null || p === 0) return null;
  return Math.round(((c - p) / p) * 1000) / 10;
}

/** `+12.5%` / `-4%` for a KPI delta, or null when there is no valid comparison. */
export function deltaLabel(changePct: number | null): string | null {
  if (changePct === null || !Number.isFinite(changePct)) return null;
  const sign = changePct > 0 ? '+' : '';
  return `${sign}${changePct}%`;
}

/** Cancelled ÷ total as a percentage, or null when the denominator is zero. */
export function cancellationRatePct(cancelled: unknown, total: unknown): number | null {
  const c = optNum(cancelled);
  const t = optNum(total);
  if (c === null || t === null || t <= 0) return null;
  return Math.round((c / t) * 1000) / 10;
}

export interface KpiTile {
  key: 'orders' | 'sales' | 'aov' | 'cancellation';
  label: string;
  /** Pre-formatted value, or null for the em dash. */
  value: string | null;
  /** Signed delta label, or null. */
  delta: string | null;
}

/**
 * The four KPI tiles for the 2x2 grid. `cancellation` is a rate (so it is
 * computed, not read) and its delta compares rates across the two periods.
 */
export function kpiTiles(
  current: Partial<OverviewSummary> | undefined,
  previous: Partial<OverviewSummary> | undefined,
): KpiTile[] {
  const cur = current ?? {};
  const prev = previous ?? {};
  const money = (v: number | null): string | null =>
    v === null ? null : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const curRate = cancellationRatePct(cur.cancelledOrders, cur.totalOrders);
  const prevRate = cancellationRatePct(prev.cancelledOrders, prev.totalOrders);

  return [
    {
      key: 'orders',
      label: 'Total orders',
      value: cur.totalOrders === null || cur.totalOrders === undefined ? null : String(cur.totalOrders),
      delta: deltaLabel(percentChange(cur.totalOrders, prev.totalOrders)),
    },
    {
      key: 'sales',
      label: 'Sales',
      value: money(cur.sales ?? null),
      delta: deltaLabel(percentChange(cur.sales, prev.sales)),
    },
    {
      key: 'aov',
      label: 'Avg order value',
      value: money(cur.averageOrderValue ?? null),
      delta: deltaLabel(percentChange(cur.averageOrderValue, prev.averageOrderValue)),
    },
    {
      key: 'cancellation',
      label: 'Cancellation rate',
      value: curRate === null ? null : `${curRate}%`,
      delta: deltaLabel(percentChange(curRate, prevRate)),
    },
  ];
}

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  pct: number;
  /** Stroke-dash length for the segment arc. */
  dash: number;
  /** Stroke-dash offset so segments tile without overlapping. */
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

/** Busiest hours, highest first, limited to `n`. */
export function peakHoursTop(hours: PeakHour[], n = 3): PeakHour[] {
  return [...hours].sort((a, b) => b.orders - a.orders).slice(0, n);
}

/** `13` → `1–2 PM`, `0` → `12–1 AM`. */
export function hourLabel(hour: number): string {
  const fmt = (h: number): { n: number; suffix: string } => {
    const suffix = h < 12 ? 'AM' : 'PM';
    const n = h % 12 === 0 ? 12 : h % 12;
    return { n, suffix };
  };
  const start = fmt(hour);
  const end = fmt((hour + 1) % 24);
  return `${start.n}–${end.n} ${end.suffix}`;
}
