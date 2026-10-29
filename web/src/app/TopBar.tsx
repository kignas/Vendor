import { useState } from 'react';
import { Bell, ChevronDown, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BottomSheet } from '@/components/BottomSheet';
import { useUiStore } from '@/app/uiStore';
import { useRestaurant } from '@/hooks/useRestaurant';
import { getRestaurant } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';
import type { AvailabilityStatus } from '@/services/api/restaurant';

const STATUS_LABEL: Record<AvailabilityStatus, string> = {
  open: 'Open',
  busy: 'Busy',
  closed_today: 'Closed today',
  temporarily_closed: 'Temporarily closed',
};

const STATUS_OPTIONS: { id: AvailabilityStatus; hint: string }[] = [
  { id: 'open', hint: 'Accepting new orders' },
  { id: 'busy', hint: 'High load, longer prep times' },
  { id: 'closed_today', hint: 'Closed for the rest of today' },
  { id: 'temporarily_closed', hint: 'Pause new orders until you reopen' },
];

function statusOf(restaurant: {
  availability?: string | { status?: string };
  isOpen?: boolean;
} | null): AvailabilityStatus {
  const raw = restaurant?.availability;
  const status = typeof raw === 'string' ? raw : raw?.status;
  if (status && status in STATUS_LABEL) return status as AvailabilityStatus;
  return restaurant?.isOpen === false ? 'temporarily_closed' : 'open';
}

/**
 * Top bar: restaurant name, outlet status control, notification bell.
 * The status pill opens a bottom sheet that PUTs /restaurant/availability —
 * the server is authoritative for the resulting state.
 */
export function TopBar() {
  const connection = useUiStore((s) => s.connection);
  const unreadCount = useUiStore((s) => s.unreadCount);
  const restaurant = useRestaurant();
  const [sheetOpen, setSheetOpen] = useState(false);
  const name = getRestaurant()?.name ?? restaurant.data?.name ?? 'Your restaurant';
  const offline = connection === 'offline';
  const status = statusOf(restaurant.data ?? null);
  const isOpen = status === 'open' || status === 'busy';

  function applyStatus(next: AvailabilityStatus) {
    restaurant.availabilityMutation.mutate(next, {
      onSuccess: () => {
        toast.success(`Status: ${STATUS_LABEL[next]}.`);
        setSheetOpen(false);
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Could not update availability.'),
    });
  }

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="app-column flex min-h-tap items-center gap-3 px-4 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{name}</p>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label={`Outlet status: ${STATUS_LABEL[status]}. Change status`}
            className={cn(
              'mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold',
              isOpen ? 'text-success' : 'text-danger',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-pill bg-current" aria-hidden="true" />
            {STATUS_LABEL[status]}
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        <span
          className={cn(
            'inline-flex items-center gap-1 text-[11px] font-semibold',
            offline ? 'text-danger' : 'text-ink-faint',
          )}
          role="status"
        >
          {offline ? (
            <WifiOff className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Wifi className="h-3 w-3" aria-hidden="true" />
          )}
          {offline ? 'Offline' : 'Online'}
        </span>

        <Link
          to="/notifications"
          aria-label={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
          }
          className="relative flex h-11 w-11 items-center justify-center rounded-pill text-ink transition-colors hover:bg-border-soft"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-brand px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Link>
      </div>

      <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Outlet status">
        <p className="px-5 pb-2 text-xs text-ink-soft">
          Tell Eatswada whether you can take new orders right now.
        </p>
        <div className="px-5 pb-5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => applyStatus(opt.id)}
              disabled={restaurant.availabilityMutation.isPending}
              className={cn(
                'flex w-full items-center gap-3 border-t border-border-soft py-3 text-left disabled:opacity-50',
                opt.id === status && 'font-bold',
              )}
            >
              <span
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-pill',
                  opt.id === 'open'
                    ? 'bg-success'
                    : opt.id === 'busy'
                      ? 'bg-warning'
                      : 'bg-danger',
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink">{STATUS_LABEL[opt.id]}</span>
                <span className="block text-xs text-ink-soft">{opt.hint}</span>
              </span>
              {opt.id === status ? <span className="text-xs text-brand">Current</span> : null}
            </button>
          ))}
        </div>
      </BottomSheet>
    </header>
  );
}
