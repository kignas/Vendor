import { Link } from 'react-router-dom';
import { ChevronRight, Receipt } from 'lucide-react';
import { KpiCard } from '@/components/KpiCard';
import { ErrorState } from '@/components/ErrorState';
import { RestaurantStatusControl } from '@/features/restaurant/RestaurantStatusControl';
import { useEarningsSummary } from '@/hooks/useEarnings';
import { useOrderQueue } from '@/hooks/useOrders';
import { ordersForTab } from '@/features/orders/orderDomain';
import { formatMoney } from '@/lib/format';

/**
 * Home overview. KPIs come from the vendor earnings summary; the order counts
 * come from the live queue. Availability uses the real
 * PUT /restaurant/availability route (shared `RestaurantStatusControl`).
 * Nothing here shows a number the backend did not send.
 */
export function HomePage() {
  const summary = useEarningsSummary('today');
  const queue = useOrderQueue();

  const current = summary.data?.current;
  const queueRows = queue.data ?? [];
  const newCount = ordersForTab('new', queueRows, []).length;
  const preparingCount = ordersForTab('preparing', queueRows, []).length;
  const readyCount = ordersForTab('ready', queueRows, []).length;

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Overview</h1>

      <RestaurantStatusControl />

      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Delivered sales"
          value={summary.isLoading ? null : formatMoney(current?.deliveredFoodSales)}
          loading={summary.isLoading}
        />
        <KpiCard
          label="Commission"
          value={summary.isLoading ? null : formatMoney(current?.deliveredCommission)}
          loading={summary.isLoading}
        />
        <KpiCard
          label="Net earnings"
          value={summary.isLoading ? null : formatMoney(current?.deliveredEarnings)}
          loading={summary.isLoading}
        />
        <KpiCard
          label="In progress"
          value={summary.isLoading ? null : formatMoney(current?.inProgress)}
          loading={summary.isLoading}
        />
      </div>

      {summary.isError ? (
        <ErrorState
          message="Could not load today's earnings."
          onRetry={() => void summary.refetch()}
          retrying={summary.isFetching}
        />
      ) : null}

      <Link
        to="/orders"
        className="flex items-center justify-between rounded-card border border-border bg-card p-4"
      >
        <div className="flex items-center gap-3">
          <Receipt className="h-5 w-5 text-brand-ink" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-ink">Live order queue</p>
            <p className="text-xs text-ink-soft" role="status" aria-live="polite">
              {queue.isLoading
                ? 'Loading…'
                : `${newCount} new · ${preparingCount} preparing · ${readyCount} ready`}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-ink-faint" aria-hidden="true" />
      </Link>
    </section>
  );
}
