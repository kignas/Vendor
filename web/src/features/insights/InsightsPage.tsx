import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';
import { ScrollTabs } from '@/components/ScrollTabs';
import { KpiCard } from '@/components/KpiCard';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ChartCard } from '@/components/ChartCard';
import { StatusPill } from '@/components/StatusPill';
import { useAnalytics, useVisitAnalytics } from '@/hooks/useAnalytics';
import type { AnalyticsPeriod } from '@/services/api/analytics';
import { enumLabel, firstNumber, formatMoney, num } from '@/lib/format';
import { cn } from '@/lib/cn';
import {
  dailySeries,
  deltaLabel,
  hasSummaryData,
  orderRates,
  peakDay,
  withinPeriodTrend,
} from './growthDomain';

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

/** `12 Oct` for a yyyy-mm-dd label, falling back to the raw string. */
function dayLabel(day: string): string {
  const d = new Date(day);
  if (Number.isNaN(d.getTime())) return day;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/**
 * Growth & Analytics. Real data from GET /vendor/analytics (+ best-effort
 * /analytics/visits). Every figure is read from the server response; a metric
 * the backend did not send is simply omitted rather than zero-filled
 * (AGENTS.md rule 5). No percentage is shown without a valid comparison basis.
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
  const rates = orderRates(s);

  const daily = useMemo(() => dailySeries(data.daily), [data.daily]);
  const topItems = Array.isArray(data.topItems) ? data.topItems : [];
  const trend = useMemo(() => withinPeriodTrend(daily, 'sales'), [daily]);
  const peak = useMemo(() => peakDay(daily), [daily]);

  const visitSummary = visits.data?.data?.summary;
  const visitDaily = (visits.data?.data?.daily ?? []).filter((r) => (num(r.views) ?? 0) > 0);
  const visitTypes = visits.data?.data?.byEventType ?? [];
  const totalViews = firstNumber(visitSummary?.totalViews);
  const uniqueVisitors = firstNumber(visitSummary?.uniqueVisitors);

  const hasKpis = hasSummaryData(s) || totalViews !== null;
  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? '';

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Growth</h1>

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

      {analytics.isError ? (
        <ErrorState
          message="Could not load analytics."
          onRetry={() => void analytics.refetch()}
          retrying={analytics.isFetching}
        />
      ) : null}

      {!analytics.isError && analytics.isLoading ? (
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
          description={`No orders or views were recorded for the last ${periodLabel.toLowerCase()}. Try another period.`}
          icon={BarChart3}
        />
      ) : null}

      {!analytics.isError && hasKpis ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {sales !== null ? (
              <KpiCard
                label="Delivered sales"
                value={formatMoney(sales)}
                delta={deltaLabel(trend.changePct)}
                hint={trend.changePct !== null ? '2nd half vs 1st half' : null}
                className="col-span-2"
              />
            ) : null}
            {total !== null ? <KpiCard label="Total orders" value={String(total)} /> : null}
            {delivered !== null ? <KpiCard label="Completed orders" value={String(delivered)} /> : null}
            {avg !== null ? <KpiCard label="Avg order value" value={formatMoney(avg)} /> : null}
            {rates.cancellationRate !== null ? (
              <KpiCard label="Cancellation rate" value={`${rates.cancellationRate}%`} />
            ) : null}
            {totalViews !== null ? <KpiCard label="Menu views" value={String(totalViews)} /> : null}
            {uniqueVisitors !== null ? (
              <KpiCard label="Unique visitors" value={String(uniqueVisitors)} />
            ) : null}
          </div>

          {peak || rates.deliveredRate !== null ? (
            <div className="rounded-card border border-border bg-card p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
                <TrendingUp className="h-4 w-4 text-brand-ink" aria-hidden="true" /> At a glance
              </h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {rates.deliveredRate !== null ? (
                  <li className="flex items-center justify-between">
                    <span className="text-ink-soft">Fulfilment rate</span>
                    <span className="font-semibold tabular-nums text-ink">
                      {rates.deliveredRate}%
                    </span>
                  </li>
                ) : null}
                {peak ? (
                  <li className="flex items-center justify-between">
                    <span className="text-ink-soft">Busiest day</span>
                    <span className="font-semibold text-ink">
                      {dayLabel(peak.day)} · {peak.orders} orders
                    </span>
                  </li>
                ) : null}
                {cancelled !== null ? (
                  <li className="flex items-center justify-between">
                    <span className="text-ink-soft">Cancelled orders</span>
                    <span className="font-semibold tabular-nums text-ink">{cancelled}</span>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {daily.length ? (
        <ChartCard title={`Delivered sales · last ${periodLabel.toLowerCase()}`}>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--es-brand-ink))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="rgb(var(--es-brand-ink))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgb(var(--es-border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tickFormatter={dayLabel}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="rgb(var(--es-ink-faint))"
                  minTickGap={16}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => formatMoney(v)}
                  labelFormatter={(l: string) => dayLabel(l)}
                  contentStyle={{
                    background: 'rgb(var(--es-card))',
                    border: '1px solid rgb(var(--es-border))',
                    borderRadius: 12,
                    fontSize: 12,
                    color: 'rgb(var(--es-ink))',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="rgb(var(--es-brand-ink))"
                  strokeWidth={2}
                  fill="url(#salesFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      ) : null}

      {daily.some((d) => d.orders > 0) ? (
        <ChartCard title="Orders per day">
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgb(var(--es-border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tickFormatter={dayLabel}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="rgb(var(--es-ink-faint))"
                  minTickGap={16}
                />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  formatter={(v: number) => [`${v} orders`, 'Orders']}
                  labelFormatter={(l: string) => dayLabel(l)}
                  contentStyle={{
                    background: 'rgb(var(--es-card))',
                    border: '1px solid rgb(var(--es-border))',
                    borderRadius: 12,
                    fontSize: 12,
                    color: 'rgb(var(--es-ink))',
                  }}
                />
                <Bar dataKey="orders" fill="rgb(var(--es-brand-ink))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      ) : null}

      {topItems.length ? (
        <ChartCard title="Best-selling items">
          <ul className="divide-y divide-border-soft">
            {topItems.map((item, i) => {
              const name = item.name ?? item.itemName ?? item._id ?? 'Item';
              const qty = firstNumber(item.quantity, item.count);
              const itemSales = firstNumber(item.sales);
              return (
                <li key={String(name) + i} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <StatusPill tone={i === 0 ? 'brand' : 'neutral'}>{i + 1}</StatusPill>
                    <span className="truncate text-ink">{name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ink-soft">
                    {qty !== null ? `${qty} sold` : ''}
                    {itemSales !== null ? `${qty !== null ? ' · ' : ''}${formatMoney(itemSales)}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        </ChartCard>
      ) : null}

      {visitDaily.length || visitTypes.length ? (
        <ChartCard title="Customer views" loading={visits.isLoading}>
          <ul className="divide-y divide-border-soft">
            {visitTypes.map((t) => (
              <li key={String(t.eventType)} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">
                  {EVENT_LABELS[String(t.eventType)] ?? enumLabel(t.eventType)}
                </span>
                <span className="tabular-nums text-ink-soft">{num(t.count) ?? 0} views</span>
              </li>
            ))}
            {visitDaily.slice(-14).map((row) => (
              <li key={String(row.day)} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">{dayLabel(String(row.day).slice(0, 10))}</span>
                <span className="tabular-nums text-ink-soft">
                  {num(row.views) ?? 0} views · {num(row.uniqueVisitors) ?? 0} unique
                </span>
              </li>
            ))}
          </ul>
        </ChartCard>
      ) : null}
    </section>
  );
}
