import { useRestaurant } from '@/hooks/useRestaurant';
import { isOutletOpen, statusOf } from '@/features/restaurant/outletStatus';

/**
 * Banner shown on the Orders screen while the restaurant is offline (paused).
 * The state comes from the server's availability, so it survives refresh and
 * re-login; existing New/Preparing/Ready orders continue normally.
 */
export function OfflineBanner() {
  const restaurant = useRestaurant();
  if (isOutletOpen(statusOf(restaurant.data ?? null))) return null;

  return (
    <p
      className="rounded-card border border-warning/40 bg-warning-bg px-3 py-2 text-xs font-semibold text-warning-ink"
      role="status"
    >
      You are offline — new orders are paused. Orders already in progress continue as normal.
    </p>
  );
}
