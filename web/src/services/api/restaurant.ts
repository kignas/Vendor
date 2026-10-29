/**
 * Restaurant endpoint module. Paths exist in routes/vendorRoutes.js.
 * Availability statuses used by the backend: open, busy, closed_today,
 * temporarily_closed.
 */
import { apiFetch } from '@/lib/api';
import type { Restaurant, RestaurantResponse } from '@/types/restaurant';

export async function fetchRestaurant(): Promise<Restaurant | null> {
  const res = await apiFetch<RestaurantResponse>('/restaurant');
  return res?.data ?? null;
}

export type AvailabilityStatus = 'open' | 'busy' | 'closed_today' | 'temporarily_closed';

/** PUT /restaurant/availability — body { status }. */
export function setAvailability(status: AvailabilityStatus): Promise<unknown> {
  return apiFetch('/restaurant/availability', { method: 'PUT', body: { status } });
}

/** PUT /restaurant/hours — body { openingHours }. */
export function setOpeningHours(
  openingHours: Record<string, { closed?: boolean; opensAt?: string; closesAt?: string }>,
): Promise<unknown> {
  return apiFetch('/restaurant/hours', { method: 'PUT', body: { openingHours } });
}
