import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Search, Loader2, X } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { OrdersEmptyState } from '@/features/orders/OrdersEmptyState';
import { ErrorState } from '@/components/ErrorState';
import { OrderCard } from '@/features/orders/OrderCard';
import { isPlacedOrder, ordersForTab, orderMatchesQuery } from '@/features/orders/orderDomain';
import { useOrderActions } from '@/features/orders/useOrderActions';
import { useOrderQueue } from '@/hooks/useOrders';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useRushMode } from '@/hooks/useRushMode';
import { UndoReadyToast } from '@/features/orders/UndoReadyToast';
import { OrderSupportSheet } from '@/features/orders/OrderSupportSheet';
import { NewOrderBanner } from '@/features/orders/NewOrderBanner';
import { OfflineBanner } from '@/features/orders/OfflineBanner';
import { AcceptOrderSheet } from '@/features/orders/AcceptOrderSheet';
import { SuccessFlash } from '@/features/orders/SuccessFlash';
import { Sheet } from '@/components/Sheet';
import { OrderChips, type OrderChip } from '@/features/orders/OrderChips';
import { InfoCarousel } from '@/features/orders/InfoCarousel';
import { printKot } from '@/features/orders/kot';
import { speakOrder } from '@/features/orders/voice';
import { useUiStore } from '@/app/uiStore';
import type { Order, OrderTab } from '@/types/order';

/** Chips map 1:1 to the existing order groups; only the label is our own. */
const CHIP_LABEL: { id: OrderTab; label: string }[] = [
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'dispatch', label: 'Picked up' },
];

export function OrdersPage() {
  const [tab, setTab] = useState<OrderTab>('preparing');
  const query = useUiStore((s) => s.orderQuery);
  const searchOpen = useUiStore((s) => s.searchOpen);
  const setQuery = useUiStore((s) => s.setOrderQuery);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const queue = useOrderQueue();
  const restaurant = useRestaurant();
  const actions = useOrderActions();
  const { defaultPrepMinutes } = useRushMode();

  const [prepOrder, setPrepOrder] = useState<Order | null>(null);
  // Index into the waiting (placed) orders for the one-of-N pager in the sheet.
  const [prepIndex, setPrepIndex] = useState(0);
  const [rejectOrder, setRejectOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [otpOrder, setOtpOrder] = useState<Order | null>(null);
  const [otp, setOtp] = useState('');
  const [extendedIds, setExtendedIds] = useState<Set<string>>(new Set());
  const [undoReadyId, setUndoReadyId] = useState<string | null>(null);
  const [supportOrder, setSupportOrder] = useState<Order | null>(null);
  // Replay key for the post-accept confirmation flash. Only set AFTER the
  // server confirms, so the animation can never precede or delay the request.
  const [confirmFlash, setConfirmFlash] = useState<{ id: number; message: string; detail: string } | null>(
    null,
  );
  const flashIdRef = useRef(0);

  const queueRows = useMemo(() => queue.data ?? [], [queue.data]);

  // Counts per group come from the live queue (the same query the nav badge
  // reads). They are only shown once the queue has loaded, so a number is never
  // guessed while loading or after an error.
  const counts = useMemo(() => {
    const rows = queue.data ?? [];
    const scheduled = ordersForTab('scheduled', rows, []).length;
    const chips: OrderChip[] = CHIP_LABEL.map((c) => ({
      ...c,
      count: ordersForTab(c.id, rows, []).length,
    }));
    // Scheduled is a fourth chip only while it actually has orders.
    if (scheduled > 0) chips.push({ id: 'scheduled', label: 'Scheduled', count: scheduled });
    return chips;
  }, [queue.data]);

  const rows = useMemo(() => {
    const base = ordersForTab(tab, queueRows, []);
    const q = query.trim().toLowerCase();
    return q ? base.filter((o) => orderMatchesQuery(o, q)) : base;
  }, [tab, queueRows, query]);

  const deliveryMode = restaurant.data?.deliveryMode;

  // The orders waiting for acceptance, in the order the sheet pages through them.
  const waiting = useMemo(() => queueRows.filter(isPlacedOrder), [queueRows]);

  function openPrep(order: Order) {
    setPrepIndex(Math.max(0, waiting.findIndex((o) => o._id === order._id)));
    setPrepOrder(order);
  }

  /** Open the sheet at the first waiting order (the new-order bar's tap action). */
  function openNewOrderSheet() {
    setPrepIndex(0);
    setPrepOrder(waiting[0] ?? null);
  }

  /** Replays the confirmation flash with a fresh key. Called only on success. */
  function showConfirm(message: string, detail: string) {
    flashIdRef.current += 1;
    setConfirmFlash({ id: flashIdRef.current, message, detail });
  }

  async function confirmAccept(order: Order, minutes: number) {
    // A refused accept triggers an authoritative refetch inside the action; if
    // the order was accepted elsewhere the vendor sees "Order already accepted".
    const ok = await actions.accept(order._id, minutes);
    if (ok) {
      setPrepOrder(null);
      showConfirm('Order accepted', `Prep time ${minutes} min · the customer can see it now`);
    }
  }

  /** Marks ready, then opens the 15-second undo window (legacy showUndoReadyToast). */
  async function handleReady(order: Order) {
    const id = order._id;
    const ok = await actions.markReady(id);
    if (ok) setUndoReadyId(id);
  }

  async function handleExtendPrep(order: Order) {
    const id = order._id;
    setExtendedIds((prev) => new Set(prev).add(id));
    await actions.extendPrep(id);
  }

  // Close the undo window after 15 seconds (mirrors the legacy interval).
  useEffect(() => {
    if (!undoReadyId) return;
    const t = window.setTimeout(() => setUndoReadyId(null), 15_000);
    return () => window.clearTimeout(t);
  }, [undoReadyId]);

  // Drop session-local extension flags once the order leaves the queue.
  useEffect(() => {
    if (!extendedIds.size) return;
    const ids = new Set(queueRows.map((o) => o._id));
    setExtendedIds((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [queueRows, extendedIds.size]);

  function handleKot(order: Order) {
    const ok = printKot(order, restaurant.data?.name ?? '');
    if (!ok) toast.error('Printing is not available on this device.');
  }

  function handleSpeak(order: Order) {
    const result = speakOrder(order);
    if (result === 'unsupported') toast.error('Voice readout is not supported on this device.');
    else if (result === 'no-voice')
      toast.error('No installed voice for English, Bengali or Hindi. Using the system default.');
  }

  async function confirmReject() {
    if (!rejectOrder) return;
    const reason = rejectReason.trim();
    if (!reason) return;
    const ok = await actions.reject(rejectOrder._id, reason);
    if (ok) {
      setRejectOrder(null);
      setRejectReason('');
      showConfirm('Order rejected', 'The customer has been notified');
    }
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

      <OfflineBanner />

      <NewOrderBanner
        orders={queueRows}
        onStop={openNewOrderSheet}
        onExpired={() => void queue.refetch()}
      />

      {/* Real-data info cards (alerts / settlement / profile); hides itself when empty. */}
      <InfoCarousel />

      {searchOpen ? (
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order no., customer or item"
            className="min-h-tap w-full rounded-btn border border-border bg-card pl-9 pr-9 text-sm text-ink outline-none focus:border-brand-ink"
            aria-label="Search orders"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSearchOpen(false);
            }}
            aria-label="Close order search"
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-pill text-ink-faint hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </label>
      ) : null}

      <OrderChips chips={counts} active={tab} onSelect={(id) => setTab(id as OrderTab)} />

      {loading ? (
        <div className="-mx-4 flex flex-col gap-2" role="status" aria-label="Loading orders">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse bg-card motion-reduce:animate-none" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          message={queue.error instanceof Error ? queue.error.message : undefined}
          onRetry={() => void queue.refetch()}
          retrying={queue.isFetching}
        />
      ) : rows.length ? (
        <div className="-mx-4 flex flex-col gap-2">
          {rows.map((o) => (
            <OrderCard
              key={o._id}
              order={o}
              deliveryMode={deliveryMode}
              busy={actions.busyIds.has(o._id)}
              extendedIds={extendedIds}
              onAccept={openPrep}
              onReject={setRejectOrder}
              onAdvance={actions.advance}
              onReady={(ord) => void handleReady(ord)}
              onExtendPrep={(ord) => void handleExtendPrep(ord)}
              onVerifyOtp={setOtpOrder}
              onKot={handleKot}
              onSpeak={handleSpeak}
              onSupport={setSupportOrder}
            />
          ))}
        </div>
      ) : query ? (
        <EmptyState
          title="No matches"
          description={`No orders match “${query}”.`}
          icon={Search}
        />
      ) : (
        // Availability-aware empty state: illustration + status copy, and an
        // action to go back online when the outlet is paused/offline.
        <OrdersEmptyState tab={tab} />
      )}

      <AcceptOrderSheet
        order={prepOrder}
        busy={prepOrder ? actions.busyIds.has(prepOrder._id) : false}
        defaultMinutes={defaultPrepMinutes}
        index={prepIndex}
        total={waiting.length}
        onAccept={(ord, minutes) => void confirmAccept(ord, minutes)}
        onReject={(ord) => {
          setPrepOrder(null);
          setRejectOrder(ord);
        }}
        onClose={() => setPrepOrder(null)}
        onPrev={() => {
          const i = Math.max(0, prepIndex - 1);
          setPrepIndex(i);
          setPrepOrder(waiting[i] ?? null);
        }}
        onNext={() => {
          const i = Math.min(waiting.length - 1, prepIndex + 1);
          setPrepIndex(i);
          setPrepOrder(waiting[i] ?? null);
        }}
      />

      {rejectOrder ? (
        <Sheet onClose={() => setRejectOrder(null)} title="Reject order" description="Tell us why this order is being rejected.">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Reason (required)"
            className="w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand-ink"
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

      {undoReadyId ? (
        <UndoReadyToast
          onUndo={() => {
            void actions.undoReady(undoReadyId);
            setUndoReadyId(null);
          }}
          onExpire={() => setUndoReadyId(null)}
        />
      ) : null}

      {supportOrder ? (
        <OrderSupportSheet
          order={supportOrder}
          vendorName={restaurant.data?.name ?? ''}
          onClose={() => setSupportOrder(null)}
        />
      ) : null}

      {otpOrder ? (
        <Sheet onClose={() => setOtpOrder(null)} title="Verify delivery PIN" description="Enter the 4-digit PIN from the customer.">
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder="4-digit PIN"
            className="min-h-tap w-full rounded-btn border border-border bg-card px-3 text-center text-lg tracking-widest text-ink outline-none focus:border-brand-ink"
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

      <SuccessFlash
        trigger={confirmFlash?.id ?? null}
        message={confirmFlash?.message ?? ''}
        detail={confirmFlash?.detail ?? null}
        onDone={() => setConfirmFlash(null)}
      />
    </section>
  );
}
