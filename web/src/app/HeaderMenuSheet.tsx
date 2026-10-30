import { Bell, LayoutGrid, LifeBuoy, LogOut, Settings, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet } from '@/components/BottomSheet';
import { useRestaurant } from '@/hooks/useRestaurant';
import { clearSession, getRestaurant } from '@/lib/auth';
import { cn } from '@/lib/cn';

/** One row in the grid sheet: an icon, a label and where it goes. */
interface MenuItem {
  label: string;
  icon: typeof LayoutGrid;
  to: string;
}

/**
 * Tools reachable only from the header grid (everything else is one tap away on
 * the bottom nav). Order matches the reference: profile, notifications, support,
 * settings, then sign out last.
 */
const ITEMS: MenuItem[] = [
  { label: 'Overview', icon: LayoutGrid, to: '/home' },
  { label: 'Restaurant profile', icon: Store, to: '/profile' },
  { label: 'Notifications', icon: Bell, to: '/notifications' },
  { label: 'Support', icon: LifeBuoy, to: '/support' },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

/**
 * The header grid ("menu") sheet. Its title is the restaurant name; it links to
 * the tools the bottom nav does not already cover, plus sign out (which clears
 * the three fixed localStorage auth keys and returns to login).
 */
export function HeaderMenuSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const restaurant = useRestaurant();
  const name = getRestaurant()?.name ?? restaurant.data?.name ?? 'Your restaurant';

  function go(to: string) {
    onOpenChange(false);
    navigate(to);
  }

  function signOut() {
    onOpenChange(false);
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={name}>
      <nav aria-label="Restaurant menu" className="flex flex-col">
        {ITEMS.map(({ label, icon: Icon, to }) => (
          <button
            key={to}
            type="button"
            onClick={() => go(to)}
            className="press flex min-h-tap items-center gap-3 border-b border-border-soft py-3 text-left"
          >
            <Icon className="h-5 w-5 shrink-0 text-ink-soft" aria-hidden="true" />
            <span className="text-sm font-semibold text-ink">{label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={signOut}
          className={cn('press flex min-h-tap items-center gap-3 py-3 text-left')}
        >
          <LogOut className="h-5 w-5 shrink-0 text-danger-ink" aria-hidden="true" />
          <span className="text-sm font-semibold text-danger-ink">Sign out</span>
        </button>
      </nav>
    </BottomSheet>
  );
}
