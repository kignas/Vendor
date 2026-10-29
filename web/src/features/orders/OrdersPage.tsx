import { useEffect, useMemo, useState } from 'react';
import { Receipt, Search, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { OrderCard } from '@/features/orders/OrderCard';
import { ordersForTab, orderMatchesQuery } from '@/features/orders/orderDomain';
import { useOrderActions } from '@/features/orders/useOrderActions';
import { useOrderHistory, useOrderQueue } from '@/hooks/useOrders';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useNewOrderAlarm } from '@/hooks/useNewOrderAlarm';
import { useUiStore } from '@/app/uiStore';
import { cn } from '@/lib/cn';
import type { Order, OrderTab } from '@/types/order';

const TABS: { id: OrderTab; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'dispatch', label: 'Dispatch' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'history', label: 'History' },
];

const PREP_CHOICES = [15, 20, 25, 30];

export function OrdersPage() {
  const [tab, setTab] = useState<OrderTab>('new');
  const [query, setQuery] = useState('');
  const queue = useOrderQueue();
  const history = useOrderHistory(tab === 'history');
  const restaurant = useRestaurant();
  const actions = useOrderActions();

  const newCount = useNewOrderAlarm(queue.data);
  const setUnreadCount = useUiStore((s) => s.setUnreadCount);
  // The bell badge doubles as the new-order count on the orders screen.
  useEffect(() => {
    setUnreadCount(newCount);
  }, [newCount, setUnreadCount]);

  const [prepOrder, setPrepOrder] = useState<Order | null>(null);
  const [prepMinutes, setPrepMinutes] = useState(25);
  const [rejectOrder, setRejectOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [otpOrder, setOtpOrder] = useState<Order | null>(null);
  const [otp, setOtp] = useState('');

  const queueRows = useMemo(() => queue.data ?? [], [queue.data]);
  const historyRows = useMemo(
    () => (history.data?.pages ?? []).flatMap((p) => p.rows),
    [history.data],
  );

  const rows = useMemo(() => {
    const base = ordersForTab(tab, queueRows, historyRows);
    const q = query.trim().toLowerCase();
    return q ? base.filter((o) => orderMatchesQuery(o, q)) : base;
  }, [tab, queueRows, historyRows, query]);

  const deliveryMode = restaurant.data?.deliveryMode;

  function openPrep(order: Order) {
    setPrepOrder(order);
    setPrepMinutes(25);
  }

  async function confirmAccept() {
    if (!prepOrder) return;
    await actions.accept(prepOrder._id, prepMinutes);
    setPrepOrder(null);
  }

  async function confirmReject() {
    if (!rejectOrder) return;
    const reason = rejectReason.trim();
    if (!reason) return;
    await actions.reject(rejectOrder._id, reason);
    setRejectOrder(null);
    setRejectReason('');
  }

  async function confirmOtp() {
    if (!otpOrder) return;
    if (!/^\d{4}$/.test(otp.trim())) return;
    await actions.verifyOtp(otpOrder._id, otp.trim());
    setOtpOrder(null);
    setOtp('');
  }

  const loading = queue.isLoading;
  const error = queue.isError;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-ink">Orders</h1>
        {queue.isFetching && !loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-ink-faint motion-reduce:animate-none" aria-label="Refreshing" />
        ) : null}
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search order no., customer or item"
          className="min-h-tap w-full rounded-btn border border-border bg-card pl-9 pr-3 text-sm text-ink outline-none focus:border-brand"
          aria-label="Search orders"
        />
      </label>

      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Order views">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                'min-h-tap shrink-0 rounded-pill px-3 text-sm font-semibold transition-colors',
                active ? 'bg-brand text-white' : 'bg-border-soft text-ink-soft',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading orders">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-card bg-card motion-reduce:animate-none" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          message={queue.error instanceof Error ? queue.error.message : undefined}
          onRetry={() => void queue.refetch()}
          retrying={queue.isFetching}
        />
      ) : tab === 'history' ? (
        history.isLoading ? (
          <div className="h-40 animate-pulse rounded-card bg-card" role="status" aria-label="Loading history" />
        ) : rows.length ? (
          <div className="space-y-3">
            {rows.map((o) => (
              <OrderCard
                key={o._id}
                order={o}
                deliveryMode={deliveryMode}
                busy={actions.busyIds.has(o._id)}
                onAccept={openPrep}
                onReject={setRejectOrder}
                onAdvance={actions.advance}
                onReady={(ord) => actions.markReady(ord._id)}
                onVerifyOtp={setOtpOrder}
              />
            ))}
            {history.hasNextPage ? (
              <button
                type="button"
                onClick={() => void history.fetchNextPage()}
                disabled={history.isFetchingNextPage}
                className="min-h-tap w-full rounded-btn border border-border bg-card text-sm font-semibold text-ink"
              >
                {history.isFetchingNextPage ? 'Loading…' : 'Load older orders'}
              </button>
            ) : null}
          </div>
        ) : (
          <EmptyState
            title={query ? 'No matches' : 'No past orders'}
            description={query ? `No orders match “${query}”.` : 'Delivered and cancelled orders appear here.'}
            icon={Receipt}
          />
        )
      ) : rows.length ? (
        <div className="space-y-3">
          {rows.map((o) => (
            <OrderCard
              key={o._id}
              order={o}
              deliveryMode={deliveryMode}
              busy={actions.busyIds.has(o._id)}
              onAccept={openPrep}
              onReject={setRejectOrder}
              onAdvance={actions.advance}
              onReady={(ord) => actions.markReady(ord._id)}
              onVerifyOtp={setOtpOrder}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={query ? 'No matches' : emptyCopy(tab).title}
          description={query ? `No orders match “${query}”.` : emptyCopy(tab).body}
          icon={Receipt}
        />
      )}

      {prepOrder ? (
        <Sheet onClose={() => setPrepOrder(null)} title="Accept order" description={`Choose a preparation time for #${prepOrder.publicOrderId || prepOrder.orderNumber || prepOrder._id.slice(-6).toUpperCase()}`}>
          <div className="flex flex-wrap gap-2">
            {PREP_CHOICES.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setPrepMinutes(min)}
                aria-pressed={min === prepMinutes}
                className={cn(
                  'min-h-tap rounded-btn border px-4 text-sm font-semibold',
                  min === prepMinutes ? 'border-brand bg-brand/10 text-brand' : 'border-border text-ink',
                )}
              >
                {min} min
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void confirmAccept()}
            disabled={actions.busyIds.has(prepOrder._id)}
            className="mt-4 min-h-tap w-full rounded-btn bg-brand text-sm font-bold text-white disabled:opacity-50"
          >
            Confirm · {prepMinutes} min
          </button>
        </Sheet>
      ) : null}

      {rejectOrder ? (
        <Sheet onClose={() => setRejectOrder(null)} title="Reject order" description="Tell us why this order is being rejected.">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Reason (required)"
            className="w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => void confirmReject()}
            disabled={!rejectReason.trim() || actions.busyIds.has(rejectOrder._id)}
            className="mt-3 min-h-tap w-full rounded-btn bg-danger text-sm font-bold text-white disabled:opacity-50"
          >
            Reject order
          </button>
        </Sheet>
      ) : null}

      {otpOrder ? (
        <Sheet onClose={() => setOtpOrder(null)} title="Verify delivery PIN" description="Enter the 4-digit PIN from the customer.">
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder="4-digit PIN"
            className="min-h-tap w-full rounded-btn border border-border bg-card px-3 text-center text-lg tracking-widest text-ink outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => void confirmOtp()}
            disabled={!/^\d{4}$/.test(otp) || actions.busyIds.has(otpOrder._id)}
            className="mt-3 min-h-tap w-full rounded-btn bg-brand text-sm font-bold text-white disabled:opacity-50"
          >
            Verify PIN
          </button>
        </Sheet>
      ) : null}
    </section>
  );
}

function emptyCopy(tab: OrderTab): { title: string; body: string } {
  switch (tab) {
    case 'new':
      return { title: 'No new orders yet', body: 'New orders will land here.' };
    case 'preparing':
      return { title: 'Nothing in the kitchen', body: 'Accepted orders waiting to go out will show up here.' };
    case 'ready':
      return { title: 'No orders waiting for a rider', body: 'Orders you mark ready appear here until a rider is assigned.' };
    case 'dispatch':
      return { title: 'No orders out for delivery', body: 'Orders move here once handed to a delivery partner.' };
    case 'scheduled':
      return { title: 'No scheduled orders', body: 'Orders placed for a later slot will appear here.' };
    default:
      return { title: 'Nothing here', body: 'Nothing to show right now.' };
  }
}

/** Minimal accessible sheet (avoids pulling a Radix dialog per action). */
function Sheet({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div className="app-column safe-bottom relative z-10 rounded-t-card bg-card p-5 animate-slide-up">
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-xs text-ink-soft">{description}</p> : null}
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
