import { useMemo } from 'react';
import { Home, MoreHorizontal, Receipt, UtensilsCrossed, Wallet } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { ordersForTab } from '@/features/orders/orderDomain';
import { useOrderQueue } from '@/hooks/useOrders';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/orders', label: 'Orders', icon: Receipt },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/more', label: 'More', icon: MoreHorizontal },
];

/**
 * Bottom navigation. Five destinations; each item is a 44px+ tap target and
 * exposes `aria-current` via NavLink. The active item shows a short top
 * indicator and a small pop on the icon so selection reads clearly.
 *
 * The Orders item carries a red badge with the number of NEW orders waiting, so
 * the vendor can see a new order from Menu, Finance or More without having to
 * open Orders. The count comes from the same live queue the Orders page uses
 * (same query key, so it is not a second request stream); while the queue is
 * loading or has failed the badge is simply hidden — a count is never guessed.
 */
export function BottomNav() {
  const queue = useOrderQueue();
  const newCount = useMemo(
    () => (queue.data ? ordersForTab('new', queue.data, []).length : 0),
    [queue.data],
  );

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card"
    >
      <ul className="app-column flex items-stretch justify-between px-1">
        {ITEMS.map(({ to, label, icon: Icon }) => {
          const badge = to === '/orders' ? newCount : 0;
          return (
            <li key={to} className="relative flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'press flex min-h-tap flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold transition-colors',
                    isActive ? 'text-ink' : 'text-ink-faint hover:text-ink-soft',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute inset-x-5 top-0 h-0.5 rounded-pill bg-brand-ink transition-transform duration-200 ease-out',
                        isActive ? 'scale-x-100' : 'scale-x-0',
                      )}
                    />
                    <span className="relative inline-flex">
                      <Icon
                        className={cn(
                          'h-6 w-6 transition-transform duration-200 ease-out',
                          isActive ? 'scale-110 text-brand-ink' : 'scale-100',
                        )}
                        aria-hidden="true"
                      />
                      {badge > 0 ? (
                        <>
                          <span
                            key={badge}
                            aria-hidden="true"
                            className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-danger px-1 text-[10px] font-bold leading-none text-white motion-safe:animate-attention-pulse"
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
