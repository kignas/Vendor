import { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Eye,
  IndianRupee,
  Percent,
  ShoppingCart,
  Users,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { KpiCard } from '@/components/KpiCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ChartCard } from '@/components/ChartCard';
import { InfoTip } from '@/components/InfoTip';
import { Sparkline } from '@/components/charts/Sparkline';
import { TrendChart, type TrendSeries } from '@/components/charts/TrendChart';
import { useAnalytics, useVisits } from '@/hooks/useAnalytics';
import { usePerformance } from '@/hooks/usePerformance';
import { useRestaurant } from '@/hooks/useRestaurant';
import { formatCount } from '@/lib/format';
import { PerformanceCard } from './PerformanceCard';
import { ConversionFunnel } from './ConversionFunnel';
import { MostViewedItems } from './MostViewedItems';
import { OrdersPanel } from './OrdersPanel';
import { AnalyticsHeader } from './AnalyticsHeader';
import type { AnalyticsPeriod } from '@/services/api/analytics';
import {
  buildFunnel,
  buildKpis,
  deltaLabel,
  funnelRows,
  normalizeAnalytics,
  orderBreakdown,
  type KpiKey,
} from './analyticsDomain';

const KPI_ICONS: Record<KpiKey, LucideIcon> = {
  views: Eye,
  visitors: Users,
  addToCart: ShoppingCart,
  completed: CheckCircle2,
  conversion: Percent,
  cancelled: XCircle,
  revenue: IndianRupee,
};

const KPI_TONES: Record<KpiKey, 'brand' | 'success' | 'info' | 'warning' | 'danger'> = {
  views: 'info',
  visitors: 'info',
  addToCart: 'brand',
  completed: 'success',
  conversion: 'brand',
  cancelled: 'danger',
  revenue: 'success',
};

/** `28 Oct` for a yyyy-mm-dd label, falling back to the raw string. */
function dayLabel(day: string): string {
  const d = new Date(day);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/**
 * Analytics (the Insights segment of the Business hub).
 *
 * Every figure is READ from the backend — the app never recomputes a rate, a
 * conversion or a comparison. Two real endpoints feed it
 * (`GET /vendor/analytics` + `GET /vendor/analytics/visits`) plus the read-only
 * `GET /vendor/performance`. Each widget owns its loading/empty/error state, so
 * one failing source cannot blank the page.
 */
export function InsightsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('7d');
  const ordersQuery = useAnalytics(period);
  const visitsQuery = useVisits(period);
  const performanceQuery = usePerformance();
  const restaurant = useRestaurant();

  const model = useMemo(
    () => normalizeAnalytics(ordersQuery.data, visitsQuery.data),
    [ordersQuery.data, visitsQuery.data],
  );
  const kpis = useMemo(() => buildKpis(model), [model]);
  const funnel = useMemo(() => funnelRows(buildFunnel(model)), [model]);
  const breakdown = useMemo(() => orderBreakdown(model), [model]);

  const refreshing = ordersQuery.isFetching || visitsQuery.isFetching || performanceQuery.isFetching;
  const updatedAt = Math.max(
    ordersQuery.dataUpdatedAt || 0,
    visitsQuery.dataUpdatedAt || 0,
    performanceQuery.dataUpdatedAt || 0,
  ) || null;

  function refreshAll() {
    void ordersQuery.refetch();
    void visitsQuery.refetch();
    void performanceQuery.refetch();
  }

  const kpisLoading = ordersQuery.isLoading && visitsQuery.isLoading;

  // Traffic trend: views + unique visitors over the period (backend series).
  const visitDaily = model.visits.daily;
  const trendLabels = visitDaily.map((d) => dayLabel(d.day));
  const trendSeries: TrendSeries[] = [
    {
      key: 'views',
      label: 'Views',
      colorVar: '--es-brand-ink',
      values: visitDaily.map((d) => d.views),
      displays: visitDaily.map((d) => formatCount(d.views)),
    },
    {
      key: 'visitors',
      label: 'Unique visitors',
      colorVar: '--es-info-ink',
      values: visitDaily.map((d) => d.uniqueVisitors),
      displays: visitDaily.map((d) => formatCount(d.uniqueVisitors)),
    },
  ];

  const viewsZero = model.visits.totalViews === 0;
  const nothingAtAll =
    !ordersQuery.isLoading &&
    !visitsQuery.isLoading &&
    (model.orders.totalOrders ?? 0) === 0 &&
    model.orders.daily.length === 0 &&
    model.visits.items.length === 0 &&
    (model.visits.totalViews ?? 0) === 0;

  return (
    <section className="space-y-4">
      <AnalyticsHeader
        restaurantName={restaurant.data?.name ?? null}
        period={period}
        onPeriodChange={setPeriod}
        updatedAt={updatedAt}
        onRefresh={refreshAll}
        refreshing={refreshing}
      />

      {/* Order-side fetch error: keeps the visit-based widgets alive (rule: one
          failing widget must not break the page). */}
      {ordersQuery.isError ? (
        <ErrorState
          message="Could not load order analytics."
          onRetry={() => void ordersQuery.refetch()}
          retrying={ordersQuery.isFetching}
        />
      ) : null}

      {kpisLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {kpis.map((k) => (
            <KpiCard key={k.key} label={k.label} value={null} loading />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {kpis.map((k) => (
            <KpiCard
              key={k.key}
              label={k.label}
              value={k.value}
              emptyLabel="Not enough data yet"
              delta={deltaLabel(k.deltaPct)}
              deltaTitle="vs previous period"
              valueTitle={k.full ?? undefined}
              invertDelta={k.invert}
              icon={KPI_ICONS[k.key]}
              tone={KPI_TONES[k.key]}
              spark={
                k.spark.length > 1 ? (
                  <span className="mt-2 block">
                    <Sparkline values={k.spark} ariaLabel={`${k.label} trend`} />
                  </span>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      {!kpisLoading && nothingAtAll ? (
        <EmptyState
          title="No analytics for this period"
          description="No orders or menu views were recorded for this period. Try another period."
          icon={BarChart3}
        />
      ) : null}

      {!kpisLoading && !nothingAtAll ? (
        <>
          <ChartCard
            title="Traffic trend"
            action={
              <InfoTip
                label="Traffic trend"
                text="Menu views and unique visitors per day in the selected period."
              />
            }
            loading={visitsQuery.isLoading}
            empty={trendLabels.length < 2}
            emptyLabel="Not enough data yet."
          >
            <TrendChart
              labels={trendLabels}
              series={trendSeries}
              ariaLabel="Menu views and unique visitors over the period"
            />
          </ChartCard>

          <ConversionFunnel rows={funnel} />

          <MostViewedItems items={model.visits.items} />

          <OrdersPanel breakdown={breakdown} />
        </>
      ) : null}

      <PerformanceCard query={performanceQuery} />

      {viewsZero && !visitsQuery.isLoading ? (
        <p className="rounded-btn bg-info-bg px-3 py-2 text-xs text-info-ink" role="note">
          Customer menu views are not being recorded yet, so views, unique visitors and the funnel
          stay at zero. This needs a visit event on the customer app — see BACKEND-GAPS.md. The
          sales, order and performance figures are real.
        </p>
      ) : null}
    </section>
  );
}
