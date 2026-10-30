import { useState } from 'react';
import { Bell, ChevronDown, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OutletStatusSheet } from '@/features/restaurant/OutletStatusSheet';
import { STATUS_LABEL, STATUS_TONE, statusOf } from '@/features/restaurant/outletStatus';
import { useUiStore } from '@/app/uiStore';
import { useRestaurant } from '@/hooks/useRestaurant';
import { getRestaurant } from '@/lib/auth';
import { cn } from '@/lib/cn';

/** Pill colours per availability tone: green open, amber busy/paused, red closed. */
const PILL_TONE = {
  success: 'bg-success-bg text-success-ink',
  warning: 'bg-warning-bg text-warning-ink',
  danger: 'bg-danger-bg text-danger-ink',
} as const;

/**
 * Top bar: restaurant name, ONE outlet-status control, notification bell.
 *
 * The status pill is the only availability control up here. It shows the real
 * state in its own colour (green Open, amber Busy / Temporarily closed, red
 * Closed today) and opens the shared OutletStatusSheet (PUT /restaurant/availability),
 * which also covers the quick "pause new orders" case. The old separate
 * online/offline switch said the same thing as this pill, so it was removed
 * from the header; the component itself is untouched in case it is wanted back.
 *
 * Network state is shown only when something is wrong ("No internet
 * connection"), instead of an always-on Wi-Fi icon nobody needs to read.
 */
export function TopBar() {
  const connection = useUiStore((s) => s.connection);
  const unreadCount = useUiStore((s) => s.unreadCount);
  const restaurant = useRestaurant();
  const [sheetOpen, setSheetOpen] = useState(false);
  const name = getRestaurant()?.name ?? restaurant.data?.name ?? 'Your restaurant';
  const offline = connection === 'offline';
  const status = statusOf(restaurant.data ?? null);

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="app-column flex min-h-tap items-center gap-2 px-4 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold text-ink">{name}</p>
          {offline ? (
            <p
              className="flex items-center gap-1 text-xs font-semibold text-danger-ink"
              role="status"
            >
              <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
              No internet connection
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={`Outlet status: ${STATUS_LABEL[status]}. Change status`}
          className="press inline-flex min-h-tap shrink-0 items-center"
        >
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[13px] font-bold',
              PILL_TONE[STATUS_TONE[status]],
            )}
          >
            <span className="h-2 w-2 rounded-pill bg-current" aria-hidden="true" />
            {STATUS_LABEL[status]}
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </button>

        <Link
          to="/notifications"
          aria-label={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
          }
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-ink transition-colors hover:bg-border-soft"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-brand px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Link>
      </div>

      <OutletStatusSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </header>
  );
}
