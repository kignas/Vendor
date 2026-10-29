import { useState } from 'react';
import { Wallet, TrendingUp } from 'lucide-react';
import { ScrollTabs } from '@/components/ScrollTabs';
import { KpiCard } from '@/components/KpiCard';
import { StatusPill } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import {
  useEarningsOrders,
  useEarningsSummary,
  useSettlementSummary,
  useWithdrawals,
} from '@/hooks/useEarnings';
import { formatMoney, formatMoney2 } from '@/lib/format';
import { enumLabel } from '@/lib/format';
import { cn } from '@/lib/cn';
import { requestWithdrawal, type EarningsPeriod } from '@/services/api/earnings';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const PERIODS: { id: EarningsPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'all', label: 'All' },
];

/**
 * Finance: earnings, commission breakdown and settlements. Balances come from
 * the vendor settlement summary; a withdrawal posts ONLY { amount } to the
 * real route. No figure is computed client-side as authoritative.
 */
export function FinancePage() {
  const [period, setPeriod] = useState<EarningsPeriod>('30d');
  const summary = useEarningsSummary(period);
  const orders = useEarningsOrders();
  const settlement = useSettlementSummary();
  const withdrawals = useWithdrawals();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');

  const current = summary.data?.current;

  const withdraw = useMutation({
    mutationFn: (value: number) => requestWithdrawal(value),
    onSuccess: () => {
      toast.success('Withdrawal requested');
      setAmount('');
      void queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Could not request withdrawal.'),
  });

  const eligible = settlement.data?.eligibleBalance;
  const canWithdraw = typeof eligible === 'number' && eligible > 0 && !withdraw.isPending;

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Finance</h1>

      <ScrollTabs activeKey={period} label="Earnings period">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            role="tab"
            data-active={period === p.id}
            aria-selected={period === p.id}
            onClick={() => setPeriod(p.id)}
            className={cn(
              'min-h-tap shrink-0 rounded-pill px-3 text-sm font-semibold',
              period === p.id ? 'bg-brand text-white' : 'bg-border-soft text-ink-soft',
            )}
          >
            {p.label}
          </button>
        ))}
      </ScrollTabs>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Delivered sales" value={formatMoney(current?.deliveredFoodSales)} loading={summary.isLoading} />
        <KpiCard label="Commission" value={formatMoney(current?.deliveredCommission)} loading={summary.isLoading} />
        <KpiCard label="Net earnings" value={formatMoney(current?.deliveredEarnings)} loading={summary.isLoading} />
        <KpiCard label="In progress" value={formatMoney(current?.inProgress)} loading={summary.isLoading} />
      </div>

      {summary.isError ? (
        <ErrorState message="Could not load earnings." onRetry={() => void summary.refetch()} retrying={summary.isFetching} />
      ) : null}

      <div className="rounded-card border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-brand-ink" aria-hidden="true" />
          <h2 className="text-sm font-bold text-ink">Settlements</h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-ink-faint">Eligible balance</p>
            <p className="text-lg font-extrabold tabular-nums text-ink">
              {settlement.isLoading ? '…' : formatMoney2(eligible)}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-faint">Available balance</p>
            <p className="text-lg font-extrabold tabular-nums text-ink">
              {settlement.isLoading ? '…' : formatMoney2(settlement.data?.availableBalance)}
            </p>
          </div>
        </div>
        {settlement.isError ? (
          <p className="mt-2 text-xs text-danger-ink">Could not load settlement summary.</p>
        ) : null}

        <div className="mt-3 flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount ₹"
            className="min-h-tap flex-1 rounded-btn border border-border bg-card px-3 text-sm text-ink outline-none focus:border-brand-ink"
            aria-label="Withdrawal amount"
          />
          <button
            type="button"
            disabled={!canWithdraw || !amount || Number(amount) <= 0}
            onClick={() => withdraw.mutate(Number(amount))}
            className="min-h-tap rounded-btn bg-brand px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {withdraw.isPending ? 'Requesting…' : 'Withdraw'}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          Payouts are processed by Eatswada; the app never calculates your balance locally.
        </p>
      </div>

      <div className="rounded-card border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <TrendingUp className="h-4 w-4 text-brand-ink" aria-hidden="true" /> Recent earnings
        </h2>
        {orders.isLoading ? (
          <div className="mt-3 h-20 animate-pulse rounded-btn bg-border-soft" />
        ) : orders.data?.length ? (
          <ul className="mt-2 divide-y divide-border-soft">
            {orders.data.map((o) => (
              <li key={o.id || o._id || o.orderNumber} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    #{o.orderNumber || (o.id || o._id || '').slice(-8).toUpperCase()}
                  </p>
                  <p className="text-[11px] text-ink-faint">
                    {o.createdAt
                      ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                      : '—'}{' '}
                    · {enumLabel(o.status)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-success-ink">
                  {formatMoney(o.restaurantNetAmount ?? o.netAmount ?? o.restaurantNet)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-ink-faint">No recent earnings.</p>
        )}
      </div>

      <div className="rounded-card border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-ink">Payout history</h2>
        {withdrawals.isLoading ? (
          <div className="mt-3 h-16 animate-pulse rounded-btn bg-border-soft" />
        ) : withdrawals.data?.length ? (
          <ul className="mt-2 divide-y divide-border-soft">
            {withdrawals.data.map((w) => (
              <li key={w._id || w.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold tabular-nums text-ink">{formatMoney2(w.amount)}</p>
                  <p className="text-[11px] text-ink-faint">
                    {w.createdAt
                      ? new Date(w.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                      : '—'}
                  </p>
                </div>
                <StatusPill tone={w.status === 'paid' ? 'success' : w.status === 'failed' ? 'danger' : 'warning'}>
                  {enumLabel(w.status) || 'Pending'}
                </StatusPill>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No payouts yet" description="Your withdrawal requests will appear here." />
        )}
      </div>
    </section>
  );
}
