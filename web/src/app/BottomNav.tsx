import { useMemo } from 'react';
import { BarChart3, Boxes, History, Receipt, Star } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { ordersForTab } from '@/features/orders/orderDomain';
import { useOrderQueue } from '@/hooks/useOrders';
import { useOverlayOpen } from '@/hooks/useOverlayOpen';
import { cn } from '@/lib/cn';
import { NAV_VAR, measureNavHeight, useMeasuredStackVar } from '@/app/bottomStack';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Receipt;
}

/**
 * Bottom navigation, Orders-first (Phase 3, Step 1). Five destinations:
 * Orders, Inventory (Menu | Stock), Business (Insights | Finance), Feedback
 * (reviews) and History. Home is no longer a tab — it stays reachable from the
 * header grid menu as "Overview".
 *
 * Each item is a 44px+ tap target and exposes `aria-current` via NavLink. The
 * active item highlights its icon AND label in the brand colour. The Orders item
 * carries a red badge with the number of NEW orders waiting, read from the same
 * live queue the Orders page uses (same query key — not a second request stream);
 * while the queue is loading or has failed the badge is simply hidden, so a
 * count is never guessed.
 */
const ITEMS: NavItem[] = [
  { to: '/orders', label: 'Orders', icon: Receipt },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/business', label: 'Business', icon: BarChart3 },
  { to: '/reviews', label: 'Feedback', icon: Star },
  { to: '/history', label: 'History', icon: History },
];

export function BottomNav() {
  const queue = useOrderQueue();
  const newCount = useMemo(
    () => (queue.data ? ordersForTab('new', queue.data, []).length : 0),
    [queue.data],
  );
  const { pathname } = useLocation();
  const activeIndex = Math.max(
    0,
    ITEMS.findIndex((item) => pathname.startsWith(item.to)),
  );

  // Measure the inner list (content height) so the nudge/bar/bubble offsets can
  // stack above the nav without double-counting the safe-area padding.
  const measureRef = useMeasuredStackVar(NAV_VAR, true, measureNavHeight);

  // A bottom sheet or dialog covers the whole screen; hide the nav so it can
  // never paint over the sheet's footer (the sheet also portals above it, but
  // hiding is belt-and-braces and removes it from the a11y tree while open).
  const overlayOpen = useOverlayOpen();
  if (overlayOpen) return null;

  return (
    <nav
      ref={measureRef}
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card"
    >
      <ul className="app-column relative flex items-stretch justify-between px-1">
        {/* One shared indicator that slides between items (transform only). */}
        <span
          aria-hidden="true"
          data-testid="nav-indicator"
          className="pointer-events-none absolute inset-x-1 top-0 h-0.5 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out"
          style={{
            width: `calc((100% - 0.5rem) / ${ITEMS.length})`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        >
          <span className="mx-5 block h-0.5 rounded-pill bg-brand-ink" />
        </span>
        {ITEMS.map(({ to, label, icon: Icon }) => {
          const badge = to === '/orders' ? newCount : 0;
          return (
            <li key={to} className="relative flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'press flex min-h-tap flex-col items-center justify-center gap-0.5 py-2 text-[13px] font-semibold transition-colors',
                    isActive ? 'text-brand-ink' : 'text-ink-soft hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative inline-flex">
                      <Icon
                        className={cn(
                          'h-6 w-6 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out',
                          isActive ? 'scale-110' : 'scale-100',
                        )}
                        aria-hidden="true"
                      />
                      {badge > 0 ? (
                        <>
                          <span
                            // Keyed by the count so a CHANGE replays the pop (scale
                            // 0.8→1); an unchanged count does not re-animate.
                            key={badge}
                            data-testid="nav-badge"
                            aria-hidden="true"
                            className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-danger px-1 text-[10px] font-bold leading-none text-white motion-safe:animate-pop-in"
                          >
                            {badge > 99 ? '99+' : badge}
                          </span>
                          <span className="sr-only">, {badge} new</span>
                        </>
                      ) : null}
                    </span>
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
