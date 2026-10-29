/**
 * Earnings + settlements endpoint module. Vendor-scoped routes only.
 *
 * IMPORTANT: GET /earnings/summary returns { data: { current, lifetime,
 * settlement } }. The dashboard reads the nested `data.current`. Declaring
 * `current` at the top level (a bug carried in one earlier iteration) makes the
 * "In progress" KPI always render an em dash.
 */
import { apiFetch } from '@/lib/api';

export type EarningsPeriod = 'today' | '7d' | '30d' | 'all';

export interface EarningsCurrent {
  deliveredFoodSales?: number;
  deliveredCommission?: number;
  deliveredEarnings?: number;
  inProgress?: number;
}

export interface EarningsSummary {
  current?: EarningsCurrent;
  lifetime?: EarningsCurrent;
  settlement?: Record<string, unknown>;
}

interface EarningsSummaryResponse {
  data?: EarningsSummary;
}

export async function fetchEarningsSummary(period: EarningsPeriod): Promise<EarningsSummary | null> {
  const res = await apiFetch<EarningsSummaryResponse>(
    `/earnings/summary?period=${encodeURIComponent(period)}`,
  );
  return res?.data ?? null;
}

export interface EarningsOrderRow {
  id?: string;
  _id?: string;
  orderNumber?: string;
  createdAt?: string;
  status?: string;
  foodSales?: number;
  commission?: number;
  restaurantNetAmount?: number;
  netAmount?: number;
  restaurantNet?: number;
  adjustments?: number;
  adjustment?: number;
  paymentMode?: string;
  [key: string]: unknown;
}

interface EarningsOrdersResponse {
  data?: EarningsOrderRow[];
}

export async function fetchEarningsOrders(page = 1, limit = 20): Promise<EarningsOrderRow[]> {
  const res = await apiFetch<EarningsOrdersResponse>(
    `/earnings/orders?view=completed&page=${page}&limit=${limit}`,
  );
  return Array.isArray(res?.data) ? res.data : [];
}

export interface ActivePayoutRequest {
  amount?: number;
  status?: string;
  requestedAt?: string;
  createdAt?: string;
  bankUtr?: string;
  reference?: string;
  transactionReference?: string;
  [key: string]: unknown;
}

export interface SettlementSummary {
  currency?: string;
  /** Total earned and not yet paid out (gross, before any pending withdrawal). */
  eligibleBalance?: number;
  /** Actually withdrawable right now (the backend field name). */
  availableForWithdrawal?: number;
  /** Vendor payout cadence: 'weekly' | 'monthly'. */
  settlementSchedule?: string;
  joinDate?: string;
  activePayoutRequest?: ActivePayoutRequest | null;
  [key: string]: unknown;
}

interface SettlementSummaryResponse {
  data?: SettlementSummary;
}

export async function fetchSettlementSummary(): Promise<SettlementSummary | null> {
  const res = await apiFetch<SettlementSummaryResponse>('/settlements/summary');
  return res?.data ?? null;
}

export interface WithdrawalRow {
  _id?: string;
  id?: string;
  amount?: number;
  status?: string;
  createdAt?: string;
  utr?: string;
  [key: string]: unknown;
}

interface WithdrawalsResponse {
  data?: WithdrawalRow[];
}

export async function fetchWithdrawals(): Promise<WithdrawalRow[]> {
  const res = await apiFetch<WithdrawalsResponse>('/settlements/withdrawals');
  return Array.isArray(res?.data) ? res.data : [];
}

/** POST /settlements/withdraw — sends ONLY { amount }. */
export function requestWithdrawal(amount: number): Promise<unknown> {
  return apiFetch('/settlements/withdraw', { method: 'POST', body: { amount } });
}
