import { Home, MoreHorizontal, Receipt, UtensilsCrossed, Wallet } from 'lucide-react';
import { NavLink } from 'react-router-dom';
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
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card"
    >
      <ul className="app-column flex items-stretch justify-between px-1">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="relative flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'press flex min-h-tap flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors',
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
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-transform duration-200 ease-out',
                      isActive ? 'scale-110 text-brand-ink' : 'scale-100',
                    )}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
