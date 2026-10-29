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
 * exposes `aria-current` via NavLink.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card"
    >
      <ul className="app-column flex items-stretch justify-between px-1">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-tap flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors',
                  isActive ? 'text-ink' : 'text-ink-faint hover:text-ink-soft',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('h-5 w-5', isActive && 'text-brand-ink')} aria-hidden="true" />
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
