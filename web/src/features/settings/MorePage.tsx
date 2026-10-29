import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, ChevronRight, LogOut, Moon, Star, Sun } from 'lucide-react';
import { useUiStore } from '@/app/uiStore';
import { useRestaurant } from '@/hooks/useRestaurant';
import { clearSession } from '@/lib/auth';
import { cn } from '@/lib/cn';

/**
 * More / Settings. Secondary destinations plus the theme toggle and logout.
 * Logout clears the three fixed localStorage keys and returns to login —
 * identical to the legacy `logout()`.
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

      <nav className="overflow-hidden rounded-card border border-border bg-card" aria-label="More sections">
        <Link to="/insights" className="flex items-center gap-3 border-b border-border-soft p-4">
          <BarChart3 className="h-5 w-5 text-brand" aria-hidden="true" />
          <span className="flex-1 text-sm font-semibold text-ink">Insights</span>
          <ChevronRight className="h-4 w-4 text-ink-faint" aria-hidden="true" />
        </Link>
        <Link to="/reviews" className="flex items-center gap-3 p-4">
          <Star className="h-5 w-5 text-brand" aria-hidden="true" />
          <span className="flex-1 text-sm font-semibold text-ink">Reviews</span>
          <ChevronRight className="h-4 w-4 text-ink-faint" aria-hidden="true" />
        </Link>
      </nav>

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
