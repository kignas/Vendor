import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ChevronRight,
  LifeBuoy,
  LogOut,
  Moon,
  Package,
  Settings as SettingsIcon,
  Star,
  Store,
} from 'lucide-react';
import { ThemeControl } from '@/components/ThemeControl';
import { useRestaurant } from '@/hooks/useRestaurant';
import { clearSession } from '@/lib/auth';
import { cn } from '@/lib/cn';

interface MoreLink {
  to: string;
  label: string;
  hint: string;
  icon: typeof Store;
}

const GROUPS: { title: string; links: MoreLink[] }[] = [
  {
    title: 'Restaurant',
    links: [
      { to: '/profile', label: 'Restaurant profile', hint: 'Business details, status and hours', icon: Store },
    ],
  },
  {
    title: 'Business tools',
    links: [
      { to: '/inventory', label: 'Inventory', hint: 'Stock and item availability', icon: Package },
      { to: '/insights', label: 'Growth & analytics', hint: 'Sales, orders and customer views', icon: BarChart3 },
    ],
  },
  {
    title: 'Customers & help',
    links: [
      { to: '/reviews', label: 'Reviews', hint: 'Customer feedback and replies', icon: Star },
      { to: '/notifications', label: 'Notifications', hint: 'Important updates and alerts', icon: Bell },
      { to: '/support', label: 'Support', hint: 'Raise and track tickets', icon: LifeBuoy },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/settings', label: 'Settings', hint: 'Preferences and session', icon: SettingsIcon },
    ],
  },
];

/**
 * More / Settings hub. Mirrors the legacy "More" sheet: restaurant profile,
 * inventory, analytics, reviews, notifications, support and settings, plus the
 * appearance selector and logout. Logout clears the three fixed localStorage keys.
 */
export function MorePage() {
  const navigate = useNavigate();
  const restaurant = useRestaurant();

  function onLogout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">More</h1>

      <div className="rounded-card border border-border bg-card p-4">
        <p className="text-sm font-bold text-ink">{restaurant.data?.name ?? 'Your restaurant'}</p>
        <p className="text-xs text-ink-soft">
          {restaurant.data?.isVerified ? 'Verified partner' : 'Verification pending'}
        </p>
      </div>

      {GROUPS.map((group) => (
        <div key={group.title}>
          <h2 className="mb-2 px-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">
            {group.title}
          </h2>
          <nav
            className="overflow-hidden rounded-card border border-border bg-card"
            aria-label={group.title}
          >
            {group.links.map(({ to, label, hint, icon: Icon }, i) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 p-4',
                  i < group.links.length - 1 && 'border-b border-border-soft',
                )}
              >
                <Icon className="h-5 w-5 text-brand-ink" aria-hidden="true" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-ink">{label}</span>
                  <span className="block text-xs text-ink-soft">{hint}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-ink-faint" aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </div>
      ))}

      <div className="rounded-card border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Moon className="h-4 w-4 text-brand-ink" aria-hidden="true" />
          <span className="text-sm font-semibold text-ink">Appearance</span>
        </div>
        <ThemeControl />
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-card border border-border bg-card p-4 text-danger-ink"
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm font-semibold">Log out</span>
      </button>

      <p className="text-center text-[11px] text-ink-faint">
        Eatswada Restaurant Partner · {import.meta.env.VITE_APP_VERSION ?? 'dev'}
      </p>
    </section>
  );
}
