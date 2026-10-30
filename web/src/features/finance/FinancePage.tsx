import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Info, Wallet } from 'lucide-react';
import { ScrollTabs } from '@/components/ScrollTabs';
import { KpiCard } from '@/components/KpiCard';
import { StatusPill } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonCard } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useEarningsOrders,
  useEarningsSummary,
  useSettlementSummary,
  useWithdrawals,
} from '@/hooks/useEarnings';
import { enumLabel, formatMoney, formatMoney2 } from '@/lib/format';
import { cn } from '@/lib/cn';
import { requestWithdrawal, type EarningsPeriod } from '@/services/api/earnings';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  earningsBreakdown,
  payoutCadenceLabel,
  payoutTone,
  settlementView,
  withdrawalEligibility,
} from './financeDomain';

const PERIODS: { id: EarningsPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'all', label: 'All time' },
];

/** `en-IN` short date, or an em dash. */
function shortDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Finance: earnings, commission and settlements.
 *
 * Every figure is read straight from the vendor-scoped backend routes. The
 * available balance uses the backend's real `availableForWithdrawal` field
 * (not a client-side subtraction), and the eligible/available split plus the
 * active payout request make the gross-vs-payable distinction explicit. A
 * withdrawal posts ONLY `{ amount }` to the real route.
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
  const view = settlementView(settlement.data);
  const rows = earningsBreakdown(current);
  const eligibility = withdrawalEligibility(view);
  const cadence = payoutCadenceLabel(view.schedule);

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

  const entered = Number(amount);
  const canWithdraw =
    eligibility.allowed &&
    amount.trim() !== '' &&
    Number.isFinite(entered) &&
    entered > 0 &&
    !withdraw.isPending;

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
        <KpiCard
          label="Delivered sales"
          value={formatMoney(current?.deliveredFoodSales)}
          loading={summary.isLoading}
        />
        <KpiCard
          label="Commission"
          value={formatMoney(current?.deliveredCommission)}
          loading={summary.isLoading}
        />
        <KpiCard
          label="Net earnings"
          value={formatMoney(current?.deliveredEarnings)}
          loading={summary.isLoading}
        />
        <KpiCard
          label="In progress"
          value={formatMoney(current?.inProgress)}
          loading={summary.isLoading}
        />
      </div>

      {summary.isError ? (
        <ErrorState
          message="Could not load earnings."
          onRetry={() => void summary.refetch()}
          retrying={summary.isFetching}
        />
      ) : null}

      {rows.length ? (
        <div className="rounded-card border border-border bg-card p-4">
          <h2 className="text-sm font-bold text-ink">How this period breaks down</h2>
          <dl className="mt-2 space-y-1.5">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <dt className={cn(row.kind === 'total' ? 'font-bold text-ink' : 'text-ink-soft')}>
                  {row.label}
                </dt>
                <dd
                  className={cn(
                    'tabular-nums',
                    row.kind === 'total' ? 'font-bold text-ink' : 'text-ink-soft',
                  )}
                >
                  {row.kind === 'neg' ? '−' : ''}
                  {formatMoney(Math.abs(row.value))}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] text-ink-soft">
            Gross sales minus commission equals your net earnings. Commission and settlement
            amounts are calculated by Eatswada; the app only displays them.
          </p>
        </div>
      ) : null}

      <div className="rounded-card border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-brand-ink" aria-hidden="true" />
          <h2 className="text-sm font-bold text-ink">Settlements</h2>
          {cadence ? <StatusPill tone="info">{cadence}</StatusPill> : null}
        </div>

        {settlement.isLoading ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : settlement.isError ? (
          <p className="mt-3 text-xs text-danger-ink" role="alert">
            Could not load settlement summary.{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => void settlement.refetch()}
            >
              Retry
            </button>
          </p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-ink-soft">Eligible balance</p>
                <p className="text-lg font-extrabold tabular-nums text-ink">
                  {formatMoney2(view.eligible)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-soft">Available to withdraw</p>
                <p className="text-lg font-extrabold tabular-nums text-ink">
                  {formatMoney2(view.available)}
                </p>
              </div>
            </div>

            {view.activeRequest ? (
              <p className="mt-3 inline-flex items-start gap-1.5 rounded-btn bg-warning-bg px-2.5 py-2 text-xs text-warning-ink">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  A payout of {formatMoney2(view.activeRequest.amount)} is{' '}
                  {enumLabel(view.activeRequest.status) || 'being processed'}
                  {view.activeRequest.requestedAt || view.activeRequest.createdAt
                    ? ` · requested ${shortDate(
                        view.activeRequest.requestedAt ?? view.activeRequest.createdAt,
                      )}`
                    : ''}
                  .
                </span>
              </p>
            ) : null}

            <div className="mt-3 flex gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount ₹"
                aria-label="Withdrawal amount"
                disabled={!eligibility.allowed}
                className="flex-1"
              />
              <Button
                variant="brand"
                disabled={!canWithdraw}
                onClick={() => withdraw.mutate(entered)}
              >
                {withdraw.isPending ? 'Requesting…' : 'Withdraw'}
              </Button>
            </div>
            {eligibility.reason ? (
              <p className="mt-2 text-[11px] text-ink-soft">{eligibility.reason}</p>
            ) : (
              <p className="mt-2 text-[11px] text-ink-soft">
                Leave the amount blank to request your full available balance. Payouts are processed
                by Eatswada.
              </p>
            )}
          </>
        )}
      </div>

      <div className="rounded-card border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <ArrowUpRight className="h-4 w-4 text-brand-ink" aria-hidden="true" /> Recent earnings
        </h2>
        {orders.isLoading ? (
          <div
            className="mt-3 h-20 animate-pulse rounded-btn bg-border-soft"
            role="status"
            aria-label="Loading earnings"
          />
        ) : orders.isError ? (
          <p className="mt-2 text-xs text-danger-ink">Could not load recent earnings.</p>
        ) : orders.data?.length ? (
          <ul className="mt-2 divide-y divide-border-soft">
            {orders.data.map((o) => (
              <li
                key={o.id || o._id || o.orderNumber}
                className="flex items-center justify-between py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    #{o.orderNumber || (o.id || o._id || '').slice(-8).toUpperCase()}
                  </p>
                  <p className="text-[11px] text-ink-soft">
                    {o.createdAt
                      ? new Date(o.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })
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
          <p className="mt-2 text-xs text-ink-soft">No recent earnings.</p>
        )}
      </div>

      <div className="rounded-card border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-ink">Payout history</h2>
        {withdrawals.isLoading ? (
          <div
            className="mt-3 h-16 animate-pulse rounded-btn bg-border-soft"
            role="status"
            aria-label="Loading payouts"
          />
        ) : withdrawals.isError ? (
          <p className="mt-2 text-xs text-danger-ink">Could not load payout history.</p>
        ) : withdrawals.data?.length ? (
          <ul className="mt-2 divide-y divide-border-soft">
            {withdrawals.data.map((w) => {
              const utr = w.utr;
              return (
                <li key={w._id || w.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tabular-nums text-ink">
                      {formatMoney2(w.amount)}
                    </p>
                    <p className="text-[11px] text-ink-soft">
                      {w.createdAt
                        ? new Date(w.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                      {utr ? ` · UTR ${utr}` : ''}
                    </p>
                  </div>
                  <StatusPill tone={payoutTone(w.status)}>
                    {enumLabel(w.status) || 'Pending'}
                  </StatusPill>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title="No payouts yet"
            description="Your withdrawal requests will appear here."
            icon={ArrowDownRight}
          />
        )}
      </div>
    </section>
  );
}
