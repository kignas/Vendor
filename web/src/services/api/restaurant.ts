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

/** Profile document returned by GET /vendor/profile (read-only). */
export interface VendorProfile {
  name?: string;
  businessType?: string;
  cuisine?: string[] | string;
  description?: string;
  phone?: string;
  contactNumber?: string;
  address?: string | Record<string, unknown>;
  image?: string;
  fssaiLicenseNumber?: string;
  fssaiVerificationStatus?: string;
  approvalStatus?: string;
  deliveryMode?: string;
  commissionRate?: number;
  settlementSchedule?: string;
  createdAt?: string;
  joinedAt?: string;
  policies?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * GET /profile is the full profile; it is read-only (no PUT /profile route).
 * The legacy screen falls back to /restaurant when /profile fails.
 */
export async function fetchProfile(): Promise<VendorProfile | null> {
  try {
    const res = await apiFetch<{ data?: VendorProfile }>('/profile');
    return res?.data ?? null;
  } catch {
    try {
      const res = await apiFetch<{ data?: VendorProfile }>('/restaurant');
      return res?.data ?? null;
    } catch {
      return null;
    }
  }
}

export interface ProfileUpdate {
  name: string;
  phone?: string;
  cuisine?: string[];
  address?: string;
  description?: string;
  image?: string;
}

/** PUT /restaurant/profile — vendor allow-list only. */
export function updateProfile(payload: ProfileUpdate): Promise<unknown> {
  return apiFetch('/restaurant/profile', { method: 'PUT', body: payload });
}

/** GET /policies — accepted policy version identifiers (informational). */
export async function fetchPolicies(): Promise<Record<string, unknown> | null> {
  try {
    const res = await apiFetch<{ data?: Record<string, unknown> }>('/policies');
    return res?.data ?? null;
  } catch {
    return null;
  }
}
