import { describe, expect, it } from 'vitest';
import {
  formatCompactNumber,
  formatCount,
  formatMoney,
  formatMoney2,
  firstNumber,
  num,
} from './format';

describe('formatMoney / formatMoney2 (₹, Indian grouping)', () => {
  it('groups in the Indian system and uses the rupee symbol', () => {
    expect(formatMoney(123456)).toBe('₹1,23,456');
    expect(formatMoney(1250)).toBe('₹1,250');
    expect(formatMoney(0)).toBe('₹0');
  });

  it('keeps two decimals for bank-facing figures', () => {
    expect(formatMoney2(1250.5)).toBe('₹1,250.50');
    expect(formatMoney2(221)).toBe('₹221.00');
  });

  it('renders a null money value as ₹0 (legacy behaviour) without throwing', () => {
    expect(formatMoney(null)).toBe('₹0');
    expect(formatMoney2(undefined)).toBe('₹0.00');
  });
});

describe('formatCount / formatCompactNumber', () => {
  it('groups large counts in the Indian system', () => {
    expect(formatCount(1234567)).toBe('12,34,567');
    expect(formatCount(320)).toBe('320');
  });

  it('compacts large numbers for KPI faces (en-IN lakh/crore units)', () => {
    expect(formatCompactNumber(12500)).toBe('12.5K');
    expect(formatCompactNumber(1250000)).toBe('12.5L');
    expect(formatCompactNumber(320)).toBe('320');
  });

  it('renders an em dash for absent or non-finite counts (never NaN)', () => {
    expect(formatCount(null)).toBe('—');
    expect(formatCompactNumber(undefined)).toBe('—');
    expect(formatCompactNumber(Number.NaN)).toBe('—');
    expect(formatCount(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('num / firstNumber', () => {
  it('mirrors the legacy coercion: null becomes 0, undefined becomes null', () => {
    // This is why the analytics domain has its own `optNum` that treats a
    // missing value as absent rather than 0 (AGENTS.md rule 5).
    expect(num(null)).toBe(0);
    expect(num(undefined)).toBeNull();
    expect(num('abc')).toBeNull();
    // A null candidate coerces to 0 and wins, matching the legacy helper.
    expect(firstNumber(undefined, null, 5)).toBe(0);
    expect(firstNumber(undefined, 5)).toBe(5);
    expect(firstNumber(undefined)).toBeNull();
  });
});
