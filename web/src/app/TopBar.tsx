import { Bell, Wifi, WifiOff } from 'lucide-react';
import { useUiStore } from '@/app/uiStore';
import { getRestaurant } from '@/lib/auth';
import { cn } from '@/lib/cn';

export interface TopBarProps {
  /** Optional restaurant name override; falls back to the cached restaurant. */
  restaurantName?: string;
  /** Called when the bell is tapped. */
  onBellClick?: () => void;
}

/**
 * Top bar: restaurant name, online/offline pill, notification bell.
 * Sticky at the top of the app column.
 */
export function TopBar({ restaurantName, onBellClick }: TopBarProps) {
  const connection = useUiStore((s) => s.connection);
  const unreadCount = useUiStore((s) => s.unreadCount);
  const name = restaurantName ?? getRestaurant()?.name ?? 'Your restaurant';
  const offline = connection === 'offline';

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="app-column flex min-h-tap items-center gap-3 px-4 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{name}</p>
          <span
            className={cn(
              'mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold',
              offline ? 'text-danger' : 'text-success',
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
        </div>

        <button
          type="button"
          onClick={onBellClick}
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
        </button>
      </div>
    </header>
  );
}
