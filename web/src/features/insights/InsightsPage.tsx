import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { ScrollTabs } from '@/components/ScrollTabs';
import { KpiCard } from '@/components/KpiCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ChartCard } from '@/components/ChartCard';
import { useAnalytics, useVisitAnalytics } from '@/hooks/useAnalytics';
import type { AnalyticsPeriod } from '@/services/api/analytics';
import { enumLabel, firstNumber, formatMoney, num } from '@/lib/format';
import { cn } from '@/lib/cn';

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'all', label: 'All time' },
];

const EVENT_LABELS: Record<string, string> = {
  menu_view: 'Menu opened',
  restaurant_view: 'Restaurant page',
};

/**
 * Insights. Real data from GET /vendor/analytics (+ best-effort
 * /analytics/visits). Every figure is read from the server response; when a
 * metric is absent the card is simply not shown (AGENTS.md rule 5). The
 * endpoint's own period selector drives the query.
 */
export function InsightsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('7d');
  const analytics = useAnalytics(period);
  const visits = useVisitAnalytics(period);

  const data = analytics.data ?? {};
  const s = data.summary ?? {};
  const total = firstNumber(s.totalOrders);
  const delivered = firstNumber(s.deliveredOrders);
  const cancelled = firstNumber(s.cancelledOrders);
  const sales = firstNumber(s.deliveredFoodSales);
  const avg = firstNumber(s.averageDeliveredOrderValue);

  const daily = Array.isArray(data.daily) ? data.daily : [];
  const topItems = Array.isArray(data.topItems) ? data.topItems : [];

  const visitSummary = visits.data?.data?.summary;
  const visitDaily = (visits.data?.data?.daily ?? []).filter((r) => (num(r.views) ?? 0) > 0);
  const visitTypes = visits.data?.data?.byEventType ?? [];
  const totalViews = firstNumber(visitSummary?.totalViews);
  const uniqueVisitors = firstNumber(visitSummary?.uniqueVisitors);

  const hasKpis =
    total !== null ||
    delivered !== null ||
    cancelled !== null ||
    sales !== null ||
    avg !== null ||
    totalViews !== null;

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Insights</h1>

      <ScrollTabs
        activeKey={period}
        label="Analytics period"
        className="-mx-4 gap-2 px-4"
      >
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

      {analytics.isError ? (
        <ErrorState
          message="Could not load analytics."
          onRetry={() => void analytics.refetch()}
          retrying={analytics.isFetching}
        />
      ) : null}

      {!analytics.isError && (analytics.isLoading || !hasKpis) ? (
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Total orders" value={null} loading />
          <KpiCard label="Delivered" value={null} loading />
          <KpiCard label="Delivered sales" value={null} loading />
          <KpiCard label="Avg order value" value={null} loading />
        </div>
      ) : null}

      {!analytics.isError && analytics.isSuccess && !hasKpis ? (
        <EmptyState
          title="No analytics for this period"
          description="Try another period or check back after more orders."
          icon={BarChart3}
        />
      ) : null}

      {!analytics.isError && hasKpis ? (
        <div className="grid grid-cols-2 gap-3">
          {total !== null ? <KpiCard label="Total orders" value={String(total)} /> : null}
          {delivered !== null ? <KpiCard label="Delivered" value={String(delivered)} /> : null}
          {cancelled !== null ? <KpiCard label="Cancelled" value={String(cancelled)} /> : null}
          {sales !== null ? <KpiCard label="Delivered sales" value={formatMoney(sales)} /> : null}
          {avg !== null ? <KpiCard label="Avg order value" value={formatMoney(avg)} /> : null}
          {totalViews !== null ? <KpiCard label="Menu views" value={String(totalViews)} /> : null}
          {uniqueVisitors !== null ? (
            <KpiCard label="Unique visitors" value={String(uniqueVisitors)} />
          ) : null}
        </div>
      ) : null}

      {visitDaily.length || visitTypes.length ? (
        <ChartCard title="Menu views" loading={visits.isLoading}>
          <ul className="divide-y divide-border-soft">
            {visitDaily.slice(-14).map((row) => (
              <li key={String(row.day)} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">{String(row.day).slice(0, 10)}</span>
                <span className="tabular-nums text-ink-soft">
                  {num(row.views) ?? 0} views · {num(row.uniqueVisitors) ?? 0} unique
                </span>
              </li>
            ))}
            {visitTypes.map((t) => (
              <li key={String(t.eventType)} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">
                  {EVENT_LABELS[String(t.eventType)] ?? enumLabel(t.eventType)}
                </span>
                <span className="tabular-nums text-ink-soft">{num(t.count) ?? 0} views</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      ) : null}

      <ChartCard title="Daily totals" empty={daily.length === 0}>
        <ul className="divide-y divide-border-soft">
          {daily.map((row, i) => {
            const day = String(row.date ?? row.day ?? row._id ?? '').slice(0, 10);
            const orders = firstNumber(row.orders, row.count);
            const amount = firstNumber(row.deliveredSales, row.sales);
            return (
              <li key={day || i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">{day}</span>
                <span className="tabular-nums text-ink-soft">
                  {orders !== null ? `${orders} orders` : ''}
                  {amount !== null ? `${orders !== null ? ' · ' : ''}${formatMoney(amount)}` : ''}
                </span>
              </li>
            );
          })}
        </ul>
      </ChartCard>

      <ChartCard title="Top-selling items" empty={topItems.length === 0}>
        <ul className="divide-y divide-border-soft">
          {topItems.map((item, i) => {
            const name = item.name ?? item.itemName ?? item._id ?? 'Item';
            const qty = firstNumber(item.quantity, item.count);
            const itemSales = firstNumber(item.sales);
            return (
              <li key={String(name) + i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">
                  {i + 1}. {name}
                </span>
                <span className="tabular-nums text-ink-soft">
                  {qty !== null ? `${qty} sold` : ''}
                  {itemSales !== null
                    ? `${qty !== null ? ' · ' : ''}${formatMoney(itemSales)}`
                    : ''}
                </span>
              </li>
            );
          })}
        </ul>
      </ChartCard>
    </section>
  );
}
