import { Link } from 'react-router-dom';
import { ChevronRight, Power, Receipt } from 'lucide-react';
import { KpiCard } from '@/components/KpiCard';
import { StatusPill } from '@/components/StatusPill';
import { ErrorState } from '@/components/ErrorState';
import { useEarningsSummary } from '@/hooks/useEarnings';
import { useOrderQueue } from '@/hooks/useOrders';
import { useRestaurant } from '@/hooks/useRestaurant';
import { ordersForTab } from '@/features/orders/orderDomain';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { AvailabilityStatus } from '@/services/api/restaurant';

const AVAILABILITY: { status: AvailabilityStatus; label: string }[] = [
  { status: 'open', label: 'Online' },
  { status: 'busy', label: 'Busy' },
  { status: 'temporarily_closed', label: 'Paused' },
  { status: 'closed_today', label: 'Closed today' },
];

function availabilityLabel(status: string | undefined): string {
  const found = AVAILABILITY.find((a) => a.status === status);
  return found?.label ?? 'Offline';
}

/**
 * Home overview. KPIs come from the vendor earnings summary; the order counts
 * come from the live queue. Availability uses the real
 * PUT /restaurant/availability route. Nothing here shows a number the backend
 * did not send.
 */
export function HomePage() {
  const restaurant = useRestaurant();
  const summary = useEarningsSummary('today');
  const queue = useOrderQueue();

  const current = summary.data?.current;
  const queueRows = queue.data ?? [];
  const newCount = ordersForTab('new', queueRows, []).length;
  const preparingCount = ordersForTab('preparing', queueRows, []).length;
  const readyCount = ordersForTab('ready', queueRows, []).length;

  const status = restaurant.data?.availability;
  const isOnline = status === 'open' || status === 'busy';

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Overview</h1>

      <div className="rounded-card border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Power className={cn('h-5 w-5', isOnline ? 'text-success-ink' : 'text-danger-ink')} aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-ink">Restaurant status</p>
              <p className="text-xs text-ink-soft">{availabilityLabel(status)}</p>
            </div>
          </div>
          {restaurant.isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded-pill bg-border-soft" />
          ) : (
            <StatusPill tone={isOnline ? 'success' : 'danger'} dot>
              {isOnline ? 'Accepting orders' : 'Not accepting'}
            </StatusPill>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {AVAILABILITY.map((a) => (
            <button
              key={a.status}
              type="button"
              disabled={
                restaurant.availabilityMutation.isPending || status === a.status
              }
              onClick={() => restaurant.availabilityMutation.mutate(a.status)}
              className={cn(
                'min-h-tap rounded-btn border text-sm font-semibold transition-colors',
                status === a.status
                  ? 'border-brand-ink bg-brand/10 text-brand-ink'
                  : 'border-border text-ink disabled:opacity-50',
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
        {restaurant.availabilityMutation.isError ? (
          <p className="mt-2 text-xs text-danger-ink" role="alert">
            Could not update status. Please try again.
          </p>
        ) : null}
      </div>

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
