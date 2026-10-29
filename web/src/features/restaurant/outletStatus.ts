import type { AvailabilityStatus } from '@/services/api/restaurant';

export const STATUS_LABEL: Record<AvailabilityStatus, string> = {
  open: 'Open',
  busy: 'Busy',
  closed_today: 'Closed today',
  temporarily_closed: 'Temporarily closed',
};

/** Short label for the compact status control (Home / header). */
export const STATUS_SHORT: Record<AvailabilityStatus, string> = {
  open: 'Online',
  busy: 'Busy',
  closed_today: 'Closed',
  temporarily_closed: 'Paused',
};

/** Status-pill tone for each availability state. */
export const STATUS_TONE: Record<AvailabilityStatus, 'success' | 'warning' | 'danger'> = {
  open: 'success',
  busy: 'warning',
  closed_today: 'danger',
  temporarily_closed: 'warning',
};

export const STATUS_OPTIONS: { id: AvailabilityStatus; hint: string }[] = [
  { id: 'open', hint: 'Accepting new orders' },
  { id: 'busy', hint: 'High load, longer prep times' },
  { id: 'closed_today', hint: 'Closed for the rest of today' },
  { id: 'temporarily_closed', hint: 'Pause new orders until you reopen' },
];

/** Order the states as they appear in the control: online first, offline last. */
export const STATUS_ORDER: AvailabilityStatus[] = [
  'open',
  'busy',
  'temporarily_closed',
  'closed_today',
];

/**
 * Reads the outlet status from the restaurant object, tolerating both the
 * `availability` string form and the `{ status }` object form. Mirrors the
 * legacy `reflectStatus` fallback chain.
 */
export function statusOf(restaurant: {
  availability?: string | { status?: string };
  isOpen?: boolean;
} | null): AvailabilityStatus {
  const raw = restaurant?.availability;
  const status = typeof raw === 'string' ? raw : raw?.status;
  if (status && status in STATUS_LABEL) return status as AvailabilityStatus;
  return restaurant?.isOpen === false ? 'temporarily_closed' : 'open';
}

export function isOutletOpen(status: AvailabilityStatus): boolean {
  return status === 'open' || status === 'busy';
}
