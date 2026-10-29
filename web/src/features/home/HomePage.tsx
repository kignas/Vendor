import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  ClipboardList,
  MessageSquare,
  Package,
  Receipt,
  Settings as SettingsIcon,
  Star,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import { KpiCard } from '@/components/KpiCard';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonCard } from '@/components/Skeletons';
import { RestaurantStatusControl } from '@/features/restaurant/RestaurantStatusControl';
import { useDashboard } from '@/hooks/useHome';
import { useOrderQueue } from '@/hooks/useOrders';
import { ordersForTab } from '@/features/orders/orderDomain';
import { formatMoney, timeAgo } from '@/lib/format';

const SHORTCUTS: { to: string; label: string; icon: typeof Receipt }[] = [
  { to: '/orders', label: 'Orders', icon: Receipt },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/insights', label: 'Growth', icon: BarChart3 },
  { to: '/reviews', label: 'Reviews', icon: Star },
  { to: '/support', label: 'Support', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

/**
 * Home overview. Operational figures come from GET /vendor/dashboard (today's
 * orders, sales, average order value, pending settlement and the alert counts);
 * the live queue counts come from the real order queue. Availability uses the
 * real PUT /restaurant/availability route (shared `RestaurantStatusControl`).
 * Nothing here shows a number the backend did not send.
 */
export function HomePage() {
  const dashboard = useDashboard();
  const queue = useOrderQueue();

  const d = dashboard.data;
  const today = d?.today;
  const alerts = d?.alerts;
  const queueRows = queue.data ?? [];
  const newCount = ordersForTab('new', queueRows, []).length;
  const preparingCount = ordersForTab('preparing', queueRows, []).length;
  const readyCount = ordersForTab('ready', queueRows, []).length;

  const alertCount = (alerts?.menuReview ?? 0) + (alerts?.lowStock ?? 0) + (alerts?.outOfStock ?? 0);

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Overview</h1>

      <RestaurantStatusControl />

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
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Delivered sales" value={formatMoney(today?.sales)} />
            <KpiCard
              label="Orders today"
              value={today?.orders != null ? String(today.orders) : '—'}
            />
            <KpiCard label="Avg order value" value={formatMoney(today?.averageOrderValue)} />
            <KpiCard label="Pending settlement" value={formatMoney(d?.pendingSettlement)} />
          </div>

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
        </>
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
                  <span className="shrink-0 text-[11px] text-ink-faint">{timeAgo(a.createdAt)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-card border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-ink">Quick actions</h2>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {SHORTCUTS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="press flex flex-col items-center gap-1.5 rounded-btn px-1 py-2 text-center text-[11px] font-semibold text-ink-soft"
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
