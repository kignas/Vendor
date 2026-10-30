import { useState } from 'react';
import { Bell, LayoutGrid, Search, WifiOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Link } from 'react-router-dom';
import { OnlineSwitch } from '@/features/restaurant/OnlineSwitch';
import { HeaderMenuSheet } from './HeaderMenuSheet';
import { useUiStore } from '@/app/uiStore';
import { getRestaurant } from '@/lib/auth';

/**
 * Sticky header. Left: the ONE availability control (OnlineSwitch pill). Right:
 * notification bell (unread badge), an order-search icon, and the grid menu.
 * The "No internet connection" message shows as a thin bar under the row, so
 * nothing shifts when the network drops.
 */
export function TopBar() {
  const connection = useUiStore((s) => s.connection);
  const unreadCount = useUiStore((s) => s.unreadCount);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const name = getRestaurant()?.name;
  const offline = connection === 'offline';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="safe-top sticky top-0 z-30 bg-card/95 backdrop-blur">
      <div className="app-column flex min-h-tap items-center gap-1 px-3 py-2">
        <OnlineSwitch className="min-w-0" />

        <span className="min-w-0 flex-1 truncate px-1 text-center text-sm font-bold text-ink" aria-hidden="true">
          {name ?? ''}
        </span>

        <Link
          to="/notifications"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-ink transition-colors hover:bg-border-soft"
        >
          {/* Keyed on the unread count: a NEW notification replays the short
              wiggle and the badge pop; an unchanged count stays still. */}
          <Bell
            key={unreadCount}
            className={cn(
              'h-5 w-5',
              unreadCount > 0 && 'motion-safe:animate-bell-wiggle',
            )}
            aria-hidden="true"
          />
          {unreadCount > 0 ? (
            <span
              key={`badge-${unreadCount}`}
              className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-brand px-1 text-[10px] font-bold text-white motion-safe:animate-pop-in"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Link>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search orders"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-ink transition-colors hover:bg-border-soft"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-haspopup="dialog"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-ink transition-colors hover:bg-border-soft"
        >
          <LayoutGrid className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {offline ? (
        <div
          role="status"
          className="app-column flex items-center justify-center gap-1.5 bg-danger-bg px-3 py-1 text-xs font-semibold text-danger-ink"
        >
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          No internet connection
        </div>
      ) : null}

      <HeaderMenuSheet open={menuOpen} onOpenChange={setMenuOpen} />
    </header>
  );
}
