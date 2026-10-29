/**
 * Pure finance helpers. No React, no fetch — so the money rules are unit-tested.
 *
 * Hard rule (AGENTS.md / master task Part F): every authoritative figure comes
 * from the backend. Nothing here recomputes a balance, commission or ledger
 * value; the helpers only *read and label* the server's fields, and distinguish
 * gross from net so the two are never confused in the UI.
 */
import { firstNumber } from '@/lib/format';
import type { ActivePayoutRequest, EarningsCurrent, SettlementSummary } from '@/services/api/earnings';

export interface SettlementView {
  /** Total earned and unpaid (backend `eligibleBalance`). */
  eligible: number | null;
  /**
   * Actually withdrawable now. The backend field is `availableForWithdrawal`;
   * we never fall back to `eligibleBalance` here because the two mean different
   * things (eligible may include an amount locked in an active request).
   */
  available: number | null;
  /** The pending withdrawal the backend reports, if any. */
  activeRequest: ActivePayoutRequest | null;
  /** Vendor payout cadence string as sent by the backend, or null. */
  schedule: string | null;
}

/** Normalise the settlement summary without inventing any figure. */
export function settlementView(summary: SettlementSummary | null | undefined): SettlementView {
  return {
    eligible: firstNumber(summary?.eligibleBalance),
    available: firstNumber(summary?.availableForWithdrawal),
    activeRequest: summary?.activePayoutRequest ?? null,
    schedule: summary?.settlementSchedule ? String(summary.settlementSchedule) : null,
  };
}

export interface MoneyRow {
  label: string;
  value: number;
  kind: '' | 'neg' | 'total';
}

/**
 * Gross → deductions → net for one earnings period. Built only from fields the
 * backend sends; a row is omitted when its field is absent (never a zero-fill).
 */
export function earningsBreakdown(current: EarningsCurrent | undefined): MoneyRow[] {
  if (!current) return [];
  const rows: MoneyRow[] = [];
  const push = (label: string, value: number | null, kind: MoneyRow['kind'] = '') => {
    if (value !== null) rows.push({ label, value, kind });
  };
  push('Delivered sales (gross)', firstNumber(current.deliveredFoodSales), '');
  push('Platform commission', firstNumber(current.deliveredCommission), 'neg');
  push('Net earnings', firstNumber(current.deliveredEarnings), 'total');
  push('In progress (not yet delivered)', firstNumber(current.inProgress), '');
  return rows;
}

/** Whether a withdrawal can be requested right now, and why not if it cannot. */
export function withdrawalEligibility(
  view: SettlementView,
): { allowed: boolean; reason: string | null } {
  if (view.activeRequest) {
    return { allowed: false, reason: 'A withdrawal request is already being processed.' };
  }
  if (view.available === null) {
    return { allowed: false, reason: 'Your withdrawable balance is not available yet.' };
  }
  if (view.available <= 0) {
    return { allowed: false, reason: 'No balance is available to withdraw.' };
  }
  return { allowed: true, reason: null };
}

/** Status-pill tone for a withdrawal / transaction row. */
export function payoutTone(status: string | undefined): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (String(status ?? '').toLowerCase()) {
    case 'paid':
    case 'completed':
    case 'success':
      return 'success';
    case 'failed':
    case 'rejected':
    case 'reversed':
      return 'danger';
    case 'pending':
    case 'processing':
    case 'requested':
    case 'initiated':
      return 'warning';
    default:
      return 'neutral';
  }
}

/** Human cadence label, e.g. `weekly` → `Weekly payouts`. */
export function payoutCadenceLabel(schedule: string | null): string | null {
  if (!schedule) return null;
  const s = schedule.toLowerCase();
  if (s === 'weekly') return 'Weekly payouts';
  if (s === 'monthly') return 'Monthly payouts';
  if (s === 'daily') return 'Daily payouts';
  return `${schedule} payouts`;
}
