import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  ClipboardList,
  MessageSquare,
  Package,
  Receipt,
  Star,
} from 'lucide-react';
import { KpiCard } from '@/components/KpiCard';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonCard } from '@/components/Skeletons';
import { RestaurantStatusControl } from '@/features/restaurant/RestaurantStatusControl';
import { isOutletOpen, statusOf } from '@/features/restaurant/outletStatus';
import { useDashboard } from '@/hooks/useHome';
import { useOrderQueue } from '@/hooks/useOrders';
import { useRestaurant } from '@/hooks/useRestaurant';
import { ordersForTab } from '@/features/orders/orderDomain';
import { formatMoney, timeAgo } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * Only tools the bottom nav does not already reach (Orders, Inventory,
 * Business and Feedback are all one tap away down there; Settings lives in the
 * grid menu).
 */
const SHORTCUTS: { to: string; label: string; icon: typeof Receipt }[] = [
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/business', label: 'Business', icon: BarChart3 },
  { to: '/reviews', label: 'Feedback', icon: Star },
  { to: '/support', label: 'Support', icon: MessageSquare },
];

function QueueTile({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-btn px-2 py-3 text-center',
        highlight ? 'bg-warning-bg text-warning-ink' : 'bg-canvas text-ink',
      )}
    >
      <p className="text-3xl font-extrabold leading-none tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs font-semibold">{label}</p>
    </div>
  );
}

/**
 * Home overview. The first thing a kitchen needs is "what needs me right now",
 * so the live order queue leads, then stock alerts, then today's numbers.
 * Operational figures come from GET /vendor/dashboard (today's orders, sales,
 * average order value, pending settlement and the alert counts); the live queue
 * counts come from the real order queue. Nothing here shows a number the backend
 * did not send.
 *
 * Availability uses the real PUT /restaurant/availability route (shared
 * `RestaurantStatusControl`). The header pill already shows and changes the
 * status, so this fuller control only takes the top slot while the restaurant is
 * NOT accepting orders (the case that needs attention); otherwise it sits lower.
 */
export function HomePage() {
  const dashboard = useDashboard();
  const queue = useOrderQueue();
  const restaurant = useRestaurant();

  const d = dashboard.data;
  const today = d?.today;
  const alerts = d?.alerts;
  const queueRows = queue.data ?? [];
  const newCount = ordersForTab('new', queueRows, []).length;
  const preparingCount = ordersForTab('preparing', queueRows, []).length;
  const readyCount = ordersForTab('ready', queueRows, []).length;

  const alertCount = (alerts?.menuReview ?? 0) + (alerts?.lowStock ?? 0) + (alerts?.outOfStock ?? 0);

  const notAccepting = restaurant.isSuccess && !isOutletOpen(statusOf(restaurant.data ?? null));

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Overview</h1>

      {notAccepting ? <RestaurantStatusControl /> : null}

      <Link
        to="/orders"
        aria-label={
          queue.isSuccess
            ? `Live orders: ${newCount} new, ${preparingCount} preparing, ${readyCount} ready`
            : 'Live orders'
        }
        className={cn(
          'block rounded-card border bg-card p-4 shadow-sm',
          newCount > 0 ? 'border-warning/50' : 'border-border',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-brand-ink" aria-hidden="true" />
            <h2 className="text-base font-extrabold text-ink">Live orders</h2>
          </div>
          <ChevronRight className="h-5 w-5 text-ink-faint" aria-hidden="true" />
        </div>
        {queue.isLoading ? (
          <p className="mt-3 text-sm text-ink-soft" role="status">
            Loading…
          </p>
        ) : queue.isError ? (
          <p className="mt-3 text-sm text-ink-soft">Could not load the order queue. Tap to open Orders.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2" aria-live="polite">
            <QueueTile label="New" value={newCount} highlight={newCount > 0} />
            <QueueTile label="Preparing" value={preparingCount} />
            <QueueTile label="Ready" value={readyCount} />
          </div>
        )}
      </Link>

      {dashboard.isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}

      {dashboard.isError ? (
        <ErrorState
          message="Could not load today's overview."
          onRetry={() => void dashboard.refetch()}
          retrying={dashboard.isFetching}
        />
      ) : null}

      {dashboard.isSuccess ? (
        <>
          {alertCount > 0 ? (
            <Link
              to="/inventory"
              className="flex items-center gap-3 rounded-card border border-warning/40 bg-warning-bg px-4 py-3 text-warning-ink"
            >
              <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="flex-1 text-sm font-semibold">
                {alerts?.outOfStock ? `${alerts.outOfStock} out of stock · ` : ''}
                {alerts?.lowStock ? `${alerts.lowStock} low on stock · ` : ''}
                {alerts?.menuReview ? `${alerts.menuReview} awaiting review` : ''}
              </p>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="Orders today"
              value={today?.orders != null ? String(today.orders) : '—'}
            />
            <KpiCard label="Delivered sales" value={formatMoney(today?.sales)} />
            <KpiCard label="Avg order value" value={formatMoney(today?.averageOrderValue)} />
            <KpiCard label="Pending settlement" value={formatMoney(d?.pendingSettlement)} />
          </div>
        </>
      ) : null}

      {d?.recentActivity?.length ? (
        <div className="rounded-card border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <ClipboardList className="h-4 w-4 text-brand-ink" aria-hidden="true" /> Recent activity
          </h2>
          <ul className="mt-2 divide-y divide-border-soft">
            {d.recentActivity.slice(0, 5).map((a, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-2">
                <p className="min-w-0 flex-1 text-sm text-ink-soft">{a.message || a.type}</p>
                {a.createdAt ? (
                  <span className="shrink-0 text-xs text-ink-faint">{timeAgo(a.createdAt)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!notAccepting ? <RestaurantStatusControl /> : null}

      <div className="rounded-card border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-ink">Quick actions</h2>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {SHORTCUTS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="press flex flex-col items-center gap-1.5 rounded-btn px-1 py-2 text-center text-xs font-semibold text-ink-soft"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-border-soft">
                <Icon className="h-5 w-5 text-brand-ink" aria-hidden="true" />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
