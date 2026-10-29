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

/**
 * The server-side reason the outlet is not accepting orders, when the backend
 * supplies one. The current backend does not return a dedicated reason field
 * (see BACKEND-GAPS.md), so this reads the plausible carriers defensively and
 * returns null otherwise — the UI then shows no reason rather than inventing
 * one. A future backend field is picked up without a client change.
 */
export function statusReasonOf(restaurant: {
  availability?: string | { status?: string; reason?: string; message?: string; note?: string; closedReason?: string; pauseReason?: string };
  availabilityReason?: string;
  closureReason?: string;
  isOpen?: boolean;
} | null): string | null {
  if (!restaurant) return null;
  const raw = restaurant.availability;
  const fromObject = typeof raw === 'object' && raw !== null ? raw : undefined;
  const candidate =
    fromObject?.reason ??
    fromObject?.message ??
    fromObject?.note ??
    fromObject?.closedReason ??
    fromObject?.pauseReason ??
    restaurant.availabilityReason ??
    restaurant.closureReason;
  const text = typeof candidate === 'string' ? candidate.trim() : '';
  return text ? text : null;
}

export interface OpeningState {
  /** True when today is a closed day in the saved schedule. */
  closedToday: boolean;
  /** `HH:MM` opening time for today, when the schedule provides one. */
  opensAt: string | null;
  /** `HH:MM` closing time for today, when the schedule provides one. */
  closesAt: string | null;
  /**
   * Whether the local clock is outside today's saved hours. Advisory only —
   * the server remains the authority on whether orders are accepted.
   */
  outsideHours: boolean;
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Reads today's saved opening hours. Purely informational: it lets the UI warn
 * "you are open but outside your saved hours" without overriding the server.
 */
export function openingStateOf(
  openingHours: Record<string, { closed?: boolean; opensAt?: string; closesAt?: string }> | undefined,
  now = new Date(),
): OpeningState | null {
  if (!openingHours || typeof openingHours !== 'object') return null;
  const day = openingHours[DAY_KEYS[now.getDay()]];
  if (!day) return null;
  const opensAt = day.opensAt || null;
  const closesAt = day.closesAt || null;
  if (day.closed) return { closedToday: true, opensAt, closesAt, outsideHours: true };
  if (!opensAt || !closesAt) return { closedToday: false, opensAt, closesAt, outsideHours: false };
  const toMinutes = (t: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const open = toMinutes(opensAt);
  const close = toMinutes(closesAt);
  if (open === null || close === null) return { closedToday: false, opensAt, closesAt, outsideHours: false };
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const outsideHours = close >= open ? minutesNow < open || minutesNow > close : minutesNow < open && minutesNow > close;
  return { closedToday: false, opensAt, closesAt, outsideHours };
}
