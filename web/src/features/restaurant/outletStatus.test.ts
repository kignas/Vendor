import { describe, expect, it } from 'vitest';
import {
  isOutletOpen,
  openingStateOf,
  STATUS_PILL,
  STATUS_PILL_TONE,
  statusOf,
  statusReasonOf,
} from './outletStatus';

describe('header pill mapping', () => {
  it('labels each availability state for the header switch', () => {
    expect(STATUS_PILL).toEqual({
      open: 'Online',
      busy: 'Busy',
      closed_today: 'Offline',
      temporarily_closed: 'Paused',
    });
  });

  it('is green only when accepting orders', () => {
    expect(STATUS_PILL_TONE.open).toBe('online');
    expect(STATUS_PILL_TONE.busy).toBe('amber');
    expect(STATUS_PILL_TONE.temporarily_closed).toBe('amber');
    expect(STATUS_PILL_TONE.closed_today).toBe('offline');
  });
});

describe('statusOf', () => {
  it('reads the object availability form', () => {
    expect(statusOf({ availability: { status: 'busy' } })).toBe('busy');
  });

  it('reads the string availability form', () => {
    expect(statusOf({ availability: 'closed_today' })).toBe('closed_today');
  });

  it('falls back to temporarily_closed when isOpen is false', () => {
    expect(statusOf({ isOpen: false })).toBe('temporarily_closed');
  });

  it('falls back to open for unknown/missing values', () => {
    expect(statusOf(null)).toBe('open');
    expect(statusOf({ availability: 'not_a_status' })).toBe('open');
  });
});

describe('isOutletOpen', () => {
  it('treats open and busy as accepting orders', () => {
    expect(isOutletOpen('open')).toBe(true);
    expect(isOutletOpen('busy')).toBe(true);
    expect(isOutletOpen('closed_today')).toBe(false);
    expect(isOutletOpen('temporarily_closed')).toBe(false);
  });
});

describe('statusReasonOf', () => {
  it('reads a reason from the availability object when the backend sends one', () => {
    expect(statusReasonOf({ availability: { status: 'closed_today', reason: 'Closed for Diwali' } })).toBe(
      'Closed for Diwali',
    );
    expect(statusReasonOf({ availability: { status: 'busy', note: 'Kitchen at capacity' } })).toBe(
      'Kitchen at capacity',
    );
  });

  it('reads a top-level reason', () => {
    expect(statusReasonOf({ availabilityReason: 'Staff shortage' })).toBe('Staff shortage');
    expect(statusReasonOf({ closureReason: 'Renovation' })).toBe('Renovation');
  });

  it('returns null rather than inventing a reason', () => {
    expect(statusReasonOf({ availability: 'closed_today' })).toBeNull();
    expect(statusReasonOf({})).toBeNull();
    expect(statusReasonOf(null)).toBeNull();
  });
});

describe('openingStateOf', () => {
  // 2026-10-29 is a Thursday.
  const thursdayNoon = new Date('2026-10-29T12:00:00');

  it('reports within-hours for a normal open day', () => {
    const state = openingStateOf(
      { thursday: { closed: false, opensAt: '09:00', closesAt: '22:00' } },
      thursdayNoon,
    );
    expect(state).toEqual({ closedToday: false, opensAt: '09:00', closesAt: '22:00', outsideHours: false });
  });

  it('flags outside-hours before opening and after closing', () => {
    const hours = { thursday: { closed: false, opensAt: '09:00', closesAt: '22:00' } };
    expect(openingStateOf(hours, new Date('2026-10-29T07:00:00'))?.outsideHours).toBe(true);
    expect(openingStateOf(hours, new Date('2026-10-29T23:00:00'))?.outsideHours).toBe(true);
  });

  it('marks a closed day', () => {
    const state = openingStateOf({ thursday: { closed: true } }, thursdayNoon);
    expect(state?.closedToday).toBe(true);
    expect(state?.outsideHours).toBe(true);
  });

  it('returns null when there is no schedule for the day', () => {
    expect(openingStateOf({ monday: { opensAt: '09:00', closesAt: '17:00' } }, thursdayNoon)).toBeNull();
    expect(openingStateOf(undefined, thursdayNoon)).toBeNull();
  });

  it('handles overnight hours without a false warning', () => {
    const hours = { thursday: { closed: false, opensAt: '18:00', closesAt: '02:00' } };
    expect(openingStateOf(hours, new Date('2026-10-29T23:30:00'))?.outsideHours).toBe(false);
    expect(openingStateOf(hours, new Date('2026-10-29T12:00:00'))?.outsideHours).toBe(true);
  });
});
