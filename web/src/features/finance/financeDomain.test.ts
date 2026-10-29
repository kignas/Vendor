import { describe, expect, it } from 'vitest';
import {
  earningsBreakdown,
  payoutCadenceLabel,
  payoutTone,
  settlementView,
  withdrawalEligibility,
} from './financeDomain';

describe('settlementView', () => {
  it('reads availableForWithdrawal (the real backend field), not a client subtraction', () => {
    const view = settlementView({
      eligibleBalance: 5000,
      availableForWithdrawal: 3100,
      settlementSchedule: 'weekly',
      activePayoutRequest: { amount: 1900, status: 'pending' },
    });
    expect(view.eligible).toBe(5000);
    expect(view.available).toBe(3100);
    expect(view.schedule).toBe('weekly');
    expect(view.activeRequest?.amount).toBe(1900);
  });

  it('never falls back to eligibleBalance for the available figure', () => {
    // Regression: the port previously read `availableBalance`, which the backend
    // does not send, so this rendered the em dash. eligible must not leak in.
    const view = settlementView({ eligibleBalance: 5000 });
    expect(view.eligible).toBe(5000);
    expect(view.available).toBeNull();
  });

  it('tolerates a null/undefined summary without inventing numbers', () => {
    expect(settlementView(null).available).toBeNull();
    expect(settlementView(undefined).eligible).toBeNull();
    expect(settlementView(null).activeRequest).toBeNull();
  });
});

describe('withdrawalEligibility', () => {
  it('blocks while a payout request is active', () => {
    const r = withdrawalEligibility({
      eligible: 5000,
      available: 3100,
      activeRequest: { amount: 1900 },
      schedule: null,
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/already being processed/i);
  });

  it('blocks when nothing is available', () => {
    expect(
      withdrawalEligibility({ eligible: 0, available: 0, activeRequest: null, schedule: null })
        .allowed,
    ).toBe(false);
    expect(
      withdrawalEligibility({ eligible: null, available: null, activeRequest: null, schedule: null })
        .allowed,
    ).toBe(false);
  });

  it('allows a positive available balance with no active request', () => {
    const r = withdrawalEligibility({
      eligible: 3100,
      available: 3100,
      activeRequest: null,
      schedule: null,
    });
    expect(r.allowed).toBe(true);
    expect(r.reason).toBeNull();
  });
});

describe('earningsBreakdown', () => {
  it('separates gross sales, commission and net', () => {
    const rows = earningsBreakdown({
      deliveredFoodSales: 5200,
      deliveredCommission: 780,
      deliveredEarnings: 4420,
      inProgress: 900,
    });
    expect(rows.find((r) => r.label.includes('gross'))?.value).toBe(5200);
    expect(rows.find((r) => r.label === 'Platform commission')?.kind).toBe('neg');
    expect(rows.find((r) => r.label === 'Net earnings')?.kind).toBe('total');
  });

  it('omits rows the backend did not send (no zero-fill)', () => {
    const rows = earningsBreakdown({ deliveredFoodSales: 1000 });
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toContain('gross');
  });

  it('returns nothing when there is no period data', () => {
    expect(earningsBreakdown(undefined)).toEqual([]);
  });
});

describe('payoutTone', () => {
  it('maps statuses to semantic tones', () => {
    expect(payoutTone('paid')).toBe('success');
    expect(payoutTone('failed')).toBe('danger');
    expect(payoutTone('pending')).toBe('warning');
    expect(payoutTone(undefined)).toBe('neutral');
  });
});

describe('payoutCadenceLabel', () => {
  it('labels known cadences and passes through others', () => {
    expect(payoutCadenceLabel('weekly')).toBe('Weekly payouts');
    expect(payoutCadenceLabel('monthly')).toBe('Monthly payouts');
    expect(payoutCadenceLabel('biweekly')).toBe('biweekly payouts');
    expect(payoutCadenceLabel(null)).toBeNull();
  });
});
