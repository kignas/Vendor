import type { AvailabilityStatus } from '@/services/api/restaurant';

export const STATUS_LABEL: Record<AvailabilityStatus, string> = {
  open: 'Open',
  busy: 'Busy',
  closed_today: 'Closed today',
  temporarily_closed: 'Temporarily closed',
};

export const STATUS_OPTIONS: { id: AvailabilityStatus; hint: string }[] = [
  { id: 'open', hint: 'Accepting new orders' },
  { id: 'busy', hint: 'High load, longer prep times' },
  { id: 'closed_today', hint: 'Closed for the rest of today' },
  { id: 'temporarily_closed', hint: 'Pause new orders until you reopen' },
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
