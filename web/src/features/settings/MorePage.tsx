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
  Sun,
} from 'lucide-react';
import { useUiStore } from '@/app/uiStore';
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
      { to: '/insights', label: 'Analytics', hint: 'Customer views, orders and sales', icon: BarChart3 },
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
 * theme toggle and logout. Logout clears the three fixed localStorage keys.
 */
export function MorePage() {
  const navigate = useNavigate();
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
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
                <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
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

      <button
        type="button"
        onClick={toggleTheme}
        className="flex w-full items-center gap-3 rounded-card border border-border bg-card p-4"
        aria-pressed={theme === 'dark'}
      >
        {theme === 'dark' ? (
          <Moon className="h-5 w-5 text-brand" aria-hidden="true" />
        ) : (
          <Sun className="h-5 w-5 text-brand" aria-hidden="true" />
        )}
        <span className="flex-1 text-left text-sm font-semibold text-ink">Dark theme</span>
        <span
          className={cn(
            'relative h-7 w-12 rounded-pill transition-colors',
            theme === 'dark' ? 'bg-brand' : 'bg-border',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-6 w-6 rounded-pill bg-white shadow transition-all',
              theme === 'dark' ? 'left-5' : 'left-0.5',
            )}
          />
        </span>
      </button>

      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-card border border-border bg-card p-4 text-danger"
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
