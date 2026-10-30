import { useMemo, useState } from 'react';
import {
  BarChart3,
  Clock,
  IndianRupee,
  Percent,
  ReceiptText,
  ShoppingBag,
  TrendingDown,
  Trophy,
} from 'lucide-react';
import { ScrollTabs } from '@/components/ScrollTabs';
import { KpiCard } from '@/components/KpiCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ChartCard } from '@/components/ChartCard';
import { GradientBarChart } from '@/components/charts/GradientBarChart';
import { LineChart } from '@/components/charts/LineChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { Sparkline } from '@/components/charts/Sparkline';
import { useAnalyticsOverview } from '@/hooks/useAnalytics';
import type { AnalyticsPeriod } from '@/services/api/analytics';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import {
  hourLabel,
  kpiTiles,
  normalizeOverview,
  peakHoursTop,
} from './analyticsDomain';

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
];

const KPI_ICONS = {
  orders: ShoppingBag,
  sales: IndianRupee,
  aov: ReceiptText,
  cancellation: Percent,
} as const;

const KPI_TONES = {
  orders: 'brand',
  sales: 'success',
  aov: 'info',
  cancellation: 'danger',
} as const;

/** `28 Oct` for a yyyy-mm-dd label, falling back to the raw string. */
function dayLabel(day: string): string {
  const d = new Date(day);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/** `Mon` short weekday for the bar-chart axis. */
function shortDay(day: string): string {
  const d = new Date(day);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString('en-IN', { weekday: 'short' });
}

/**
 * Analytics. Real data from the aggregated `GET /vendor/analytics/overview`
 * (with a transparent fallback to `/analytics` + `/analytics/visits` until it
 * deploys). Every figure is read from the server; a metric the backend did not
 * send is omitted rather than zero-filled (AGENTS.md rule 5). Charts are
 * lightweight inline SVG — no chart library, no paid service.
 */
export function InsightsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('7d');
  const query = useAnalyticsOverview(period);

  const source = query.data?.source;
  const overview = useMemo(() => normalizeOverview(query.data?.raw), [query.data?.raw]);
  const tiles = useMemo(() => kpiTiles(overview.current, overview.previous), [overview]);

  const daily = overview.daily;
  const barData = daily.slice(-7).map((d) => ({ label: shortDay(d.date), value: d.orders }));
  const linePoints = daily.map((d) => ({
    key: d.date,
    label: dayLabel(d.date),
    value: d.sales,
    display: formatMoney(d.sales),
  }));
  const topDishes = overview.topItems.slice(0, 5);
  const worstDishes = overview.worstItems.slice(0, 5);
  const peaks = peakHoursTop(overview.peakHours, 3);

  const totalViews = overview.visits?.totalViews ?? null;
  const uniqueVisitors = overview.visits?.uniqueVisitors ?? null;
  const viewsAreZero = totalViews === 0;

  const hasData =
    (overview.current.totalOrders ?? 0) > 0 ||
    daily.length > 0 ||
    topDishes.length > 0 ||
    (totalViews !== null && totalViews > 0);

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Analytics</h1>

      <ScrollTabs activeKey={period} label="Analytics period" className="-mx-4 gap-2 px-4">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            data-active={period === p.id}
            aria-selected={period === p.id}
            onClick={() => setPeriod(p.id)}
            className={cn(
              'min-h-tap shrink-0 rounded-pill px-3 text-sm font-semibold transition-colors',
              period === p.id ? 'bg-brand text-white' : 'bg-border-soft text-ink-soft',
            )}
          >
            {p.label}
          </button>
        ))}
      </ScrollTabs>

      {query.isError ? (
        <ErrorState
          message="Could not load analytics."
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : null}

      {!query.isError && query.isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <KpiCard key={t.key} label={t.label} value={null} loading />
          ))}
        </div>
      ) : null}

      {!query.isError && query.isSuccess && !hasData ? (
        <EmptyState
          title="No analytics for this period"
          description="No orders or views were recorded for this period. Try another period."
          icon={BarChart3}
        />
      ) : null}

      {!query.isError && query.isSuccess && hasData ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {tiles.map((t) => (
              <KpiCard
                key={t.key}
                label={t.label}
                value={t.value}
                delta={t.delta}
                icon={KPI_ICONS[t.key]}
                tone={KPI_TONES[t.key]}
              />
            ))}
          </div>

          {barData.some((b) => b.value > 0) ? (
            <section className="rounded-card border border-border bg-gradient-to-br from-brand/10 via-card to-card p-4">
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink">Orders</h2>
                <span className="text-[11px] font-semibold text-ink-faint">Last 7 days</span>
              </header>
              <GradientBarChart data={barData} ariaLabel="Orders · last 7 days" />
            </section>
          ) : null}

          {linePoints.length > 1 ? (
            <ChartCard
              title="Sales trend"
              action={
                <select
                  aria-label="Sales trend period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}
                  className="min-h-tap rounded-btn border border-border bg-card px-2 text-xs font-semibold text-ink"
                >
                  {PERIODS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              }
            >
              <LineChart points={linePoints} ariaLabel="Sales trend" />
            </ChartCard>
          ) : null}

          {overview.paymentMix.length ? (
            <DonutChart
              title="Payment methods"
              unit="orders"
              data={overview.paymentMix.map((r) => ({ key: r.key, label: r.label, value: r.orders }))}
            />
          ) : null}

          {overview.dietMix.length ? (
            <DonutChart
              title="Veg vs non-veg"
              unit="orders"
              data={overview.dietMix.map((r) => ({ key: r.key, label: r.label, value: r.orders }))}
            />
          ) : null}

          {topDishes.length ? (
            <ChartCard title="Top dishes">
              <ul className="divide-y divide-border-soft">
                {topDishes.map((item, i) => (
                  <li key={item.name + i} className="flex items-center justify-between gap-3 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-pill bg-brand/10 text-[10px] font-bold text-brand-ink">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm text-ink">{item.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      {item.spark.length > 1 ? (
                        <Sparkline values={item.spark} ariaLabel={`${item.name} trend`} />
                      ) : null}
                      <span className="text-sm font-semibold tabular-nums text-ink-soft">
                        {item.quantity} orders
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </ChartCard>
          ) : null}

          {worstDishes.length ? (
            <ChartCard title="Worst sellers">
              <ul className="divide-y divide-border-soft">
                {worstDishes.map((item, i) => (
                  <li key={item.name + i} className="flex items-center justify-between gap-2 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <TrendingDown className="h-4 w-4 shrink-0 text-danger-ink" aria-hidden="true" />
                      <span className="truncate text-sm text-ink">{item.name}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-soft">
                      {item.quantity} orders
                    </span>
                  </li>
                ))}
              </ul>
            </ChartCard>
          ) : null}

          {peaks.length ? (
            <ChartCard
              title="Peak hours"
              action={<Clock className="h-4 w-4 text-ink-faint" aria-hidden="true" />}
            >
              <ul className="space-y-2">
                {peaks.map((p) => (
                  <li key={p.hour} className="flex items-center justify-between text-sm">
                    <span className="text-ink-soft">{hourLabel(p.hour)}</span>
                    <span className="font-semibold tabular-nums text-ink">{p.orders} orders</span>
                  </li>
                ))}
              </ul>
            </ChartCard>
          ) : null}

          {totalViews !== null || uniqueVisitors !== null ? (
            <div className="grid grid-cols-2 gap-3">
              {totalViews !== null ? (
                <KpiCard label="Menu views" value={String(totalViews)} icon={Trophy} tone="warning" />
              ) : null}
              {uniqueVisitors !== null ? (
                <KpiCard label="Unique visitors" value={String(uniqueVisitors)} icon={Trophy} tone="warning" />
              ) : null}
            </div>
          ) : null}

          {viewsAreZero ? (
            <p className="rounded-btn bg-info-bg px-3 py-2 text-xs text-info-ink" role="note">
              Customer menu views are not being recorded yet, so views and unique visitors stay at
              zero. This needs a visit event on the customer app — see BACKEND-GAPS.md. The sales
              and order figures above are real.
            </p>
          ) : null}

          {source === 'composed' ? (
            <p className="text-[11px] text-ink-faint" role="note">
              Comparison and mix charts appear once the aggregated analytics endpoint is deployed.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
