import { describe, expect, it } from 'vitest';
import { isOutletOpen, statusOf } from './outletStatus';

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
