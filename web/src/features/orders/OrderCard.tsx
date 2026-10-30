import { useEffect, useId, useRef, useState } from 'react';
import {
  CalendarClock,
  Bike,
  ChevronDown,
  Copy,
  LifeBuoy,
  MessageSquare,
  MoreVertical,
  Printer,
  Timer,
  Utensils,
  Volume2,
} from 'lucide-react';
import { DietMark } from '@/components/DietMark';
import { StatusPill } from '@/components/StatusPill';
import { enumLabel, formatMoney, kptPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { caps } from '@/lib/caps';
import { useNow } from '@/hooks/useNow';
import { PrepStrip } from '@/features/orders/PrepStrip';
import { RiderStatus } from '@/features/orders/RiderStatus';
import { ItemDetailSheet } from '@/features/orders/ItemDetailSheet';
import { formatCountdown, useAcceptanceWindow } from '@/features/orders/acceptanceWindow';
import {
  billRows,
  commissionPctOf,
  cutleryOptOut,
  dietOf,
  hasRiderData,
  itemDetailOf,
  itemPriceOf,
  loyaltyLine,
  orderRef,
  orderTotalOf,
  paymentModeOf,
  pickupCodeOf,
  prepDeadlineOf,
  prepStartedAtOf,
  scheduledAtOf,
  ticketStamp,
} from '@/features/orders/orderDomain';
import type { Order, OrderItem } from '@/types/order';

function mmss(ms: number): string {
  const secs = Math.ceil(ms / 1000);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

/**
 * Finished orders collapse their item list; live orders always show it.
 */
const FINISHED_STATUSES = new Set(['delivered', 'cancelled']);

/** Filled status-badge tone per server status. The label is rendered raw. */
function statusTone(status: string): 'info' | 'warning' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'confirmed':
    case 'preparing':
      return 'warning';
    case 'waiting_for_rider':
    case 'assigned':
    case 'out_for_delivery':
      return 'info';
    case 'otp_verified':
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

export interface OrderCardProps {
  order: Order;
  /** Restaurant delivery mode, for the self-delivery PIN gate. */
  deliveryMode?: string | undefined;
  busy?: boolean;
  /** Order ids with a used one-time +5 min prep extension (session-local). */
  extendedIds?: Set<string>;
  /** Hide the status action footer (the New tab uses the acceptance sheet). */
  hideFooter?: boolean;
  onAccept: (order: Order) => void;
  onReject: (order: Order) => void;
  onAdvance: (order: Order) => void;
  onReady: (order: Order) => void;
  onExtendPrep: (order: Order) => void;
  onVerifyOtp: (order: Order) => void;
  onKot?: (order: Order) => void;
  onSpeak?: (order: Order) => void;
  onSupport?: (order: Order) => void;
}

/** Shared sizing for the one main action on every card (52px, full width). */
const PRIMARY_BTN =
  'min-h-[52px] w-full rounded-btn text-base font-extrabold text-white disabled:opacity-50';

/**
 * Ready CTA with the shared prep deadline. Mirrors the legacy split-fill
 * `startKptTimer` label: "Order ready (mm:ss)" while the deadline is in the
 * future, plain "Order ready" otherwise. The button is never disabled by the
 * timer — the kitchen can always mark food ready early.
 */
function ReadyButton({ order, busy, onReady }: { order: Order; busy: boolean; onReady: (order: Order) => void }) {
  const deadline = prepDeadlineOf(order);
  const active = caps.prepCountdown && deadline !== null;
  const now = useNow(1000, active);
  const remaining = deadline !== null ? deadline - now : 0;
  const started = prepStartedAtOf(order);
  const pct = deadline !== null ? kptPct(deadline, started) : 100;
  const showTimer = active && remaining > 0;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onReady(order)}
      className={cn(PRIMARY_BTN, 'relative mt-3 overflow-hidden bg-info')}
    >
      <span
        className="absolute inset-y-0 left-0 bg-white/20"
        style={{ width: `${showTimer ? pct : 100}%` }}
        aria-hidden="true"
      />
      <span className="relative">
        {showTimer ? `Order ready (${mmss(remaining)})` : 'Order ready'}
      </span>
    </button>
  );
}

/**
 * Cutlery preference and scheduled-slot strips. Cutlery follows the Step 4/5
 * rule (an explicit opt-out only); a scheduled slot is shown only for a future
 * delivery time. Every value is server-sourced.
 */
function TicketStrips({ order }: { order: Order }) {
  const cutlery = cutleryOptOut(order);
  const slotAt = scheduledAtOf(order);
  const now = useNow(30_000, slotAt !== null && slotAt > Date.now());

  const showSlot = slotAt !== null && slotAt > now;
  if (!cutlery && !showSlot) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {cutlery ? (
        <p className="inline-flex items-start gap-1.5 rounded-btn border border-danger px-2.5 py-1.5 text-[13px] font-semibold text-danger-ink">
          <Utensils className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Don&rsquo;t send cutlery, tissues and straws</span>
        </p>
      ) : null}
      {showSlot ? (
        <p className="inline-flex items-start gap-1.5 rounded-btn bg-info-bg px-2.5 py-1.5 text-[13px] text-info-ink">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Scheduled for{' '}
            {new Date(slotAt).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * One item row. The name is a dashed-underline button (opens the item sheet)
 * only when the item carries real customisation data; otherwise it is plain
 * text with no tap target.
 */
function ItemRow({ item, onOpenDetail }: { item: OrderItem; onOpenDetail: (item: OrderItem) => void }) {
  const qty = Number(item.quantity) || 1;
  const price = itemPriceOf(item);
  const hasDetail = itemDetailOf(item) !== null;
  const name = item.name || 'Item';

  return (
    <li className="flex items-start gap-2.5 py-2">
      <DietMark item={item} />
      <span className="w-8 shrink-0 text-base font-extrabold tabular-nums text-ink">{qty}×</span>
      <span className="min-w-0 flex-1">
        {hasDetail ? (
          <button
            type="button"
            onClick={() => onOpenDetail(item)}
            aria-label={`View details for ${name}`}
            className="text-left text-[15px] font-semibold leading-snug text-ink underline decoration-dashed decoration-ink-faint underline-offset-2"
          >
            {name}
          </button>
        ) : (
          <span className="text-[15px] font-semibold leading-snug text-ink">{name}</span>
        )}
      </span>
      {price !== null ? (
        <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-soft">
          {formatMoney(price)}
        </span>
      ) : null}
    </li>
  );
}

/**
 * Row-1 action menu (kebab). Holds the reference-only actions that used to sit
 * in the card body: Print KOT, Read aloud, Extend prep (one-time) and Get help.
 */
function ActionMenu({
  order,
  extended,
  busy,
  onKot,
  onSpeak,
  onSupport,
  onExtendPrep,
}: {
  order: Order;
  extended: boolean;
  busy: boolean;
  onKot?: ((order: Order) => void) | undefined;
  onSpeak?: ((order: Order) => void) | undefined;
  onSupport?: ((order: Order) => void) | undefined;
  onExtendPrep: (order: Order) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemCls =
    'flex w-full items-center gap-2 rounded-btn px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50';

  function run(fn: ((order: Order) => void) | undefined) {
    setOpen(false);
    fn?.(order);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Order actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-btn text-ink-soft hover:text-ink"
      >
        <MoreVertical className="h-5 w-5" aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-10 z-20 w-48 rounded-btn border border-border bg-card py-1 shadow-lg animate-fade-in"
        >
          <button type="button" role="menuitem" className={itemCls} onClick={() => run(onKot)}>
            <Printer className="h-4 w-4" aria-hidden="true" /> Print KOT
          </button>
          <button type="button" role="menuitem" className={itemCls} onClick={() => run(onSpeak)}>
            <Volume2 className="h-4 w-4" aria-hidden="true" /> Read aloud
          </button>
          {order.status === 'preparing' ? (
            <button
              type="button"
              role="menuitem"
              disabled={extended || busy}
              className={itemCls}
              onClick={() => run(onExtendPrep)}
            >
              <Timer className="h-4 w-4" aria-hidden="true" />
              {extended ? 'Extend prep (+5 min added)' : 'Extend prep (+5 min)'}
            </button>
          ) : null}
          <button type="button" role="menuitem" className={itemCls} onClick={() => run(onSupport)}>
            <LifeBuoy className="h-4 w-4" aria-hidden="true" /> Get help
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Rider box (Phase 3, Step 5). A bordered row with a scooter icon wrapping the
 * existing `RiderStatus` copy. Shown ONLY when the server actually sent rider
 * data — never for a bare "waiting" status, and never with an invented count.
 */
function RiderBox({ order }: { order: Order }) {
  if (!hasRiderData(order)) return null;
  return (
    <div className="mt-2 flex items-start gap-2 rounded-btn border border-border px-3 py-2">
      <Bike className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <RiderStatus order={order} />
      </div>
    </div>
  );
}

/**
 * Response countdown for a new (placed) order, shown for scheduled orders that
 * still render as a card. Calm amber while there is time, red in the final
 * minute and once it lapses, with a thin bar that drains. Derived from the same
 * server deadline; omitted when the order has no usable created time.
 */
function ResponseCountdown({
  order,
  remaining,
  deadline,
  expired,
}: {
  order: Order;
  remaining: number;
  deadline: number;
  expired: boolean;
}) {
  const urgent = expired || remaining <= 60_000;
  const createdMs = new Date(order.createdAt ?? '').getTime();
  const total = Number.isFinite(createdMs) ? deadline - createdMs : 0;
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : null;

  return (
    <div
      className={cn(
        'relative mt-3 overflow-hidden rounded-btn px-3 py-2.5',
        urgent ? 'bg-danger-bg text-danger-ink' : 'bg-warning-bg text-warning-ink',
      )}
      aria-live="polite"
    >
      <p className="flex items-center gap-2 text-sm font-extrabold tabular-nums">
        <Timer className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {expired
            ? 'Response window expired · updating…'
            : `Respond within ${formatCountdown(remaining)}`}
        </span>
      </p>
      {pct !== null && !expired ? (
        <span className="absolute inset-x-0 bottom-0 h-1 bg-ink/10" aria-hidden="true">
          <span
            className={cn('block h-full transition-[width] duration-1000 ease-linear', urgent ? 'bg-danger' : 'bg-warning')}
            style={{ width: `${pct}%` }}
          />
        </span>
      ) : null}
    </div>
  );
}

/**
 * A single order card, rebuilt as a flat full-width section (Phase 3, Step 5):
 * no coloured left edge, no card radius or shadow. Renders only fields the
 * server supplies — the total, bill breakdown, payment mode, commission and
 * rider state each appear only when the corresponding server data exists
 * (never invented).
 */
export function OrderCard({
  order,
  deliveryMode,
  busy = false,
  extendedIds,
  hideFooter = false,
  onAccept,
  onReject,
  onAdvance,
  onReady,
  onExtendPrep,
  onVerifyOtp,
  onKot,
  onSpeak,
  onSupport,
}: OrderCardProps) {
  const [billOpen, setBillOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<OrderItem | null>(null);
  const billId = useId();

  const items = Array.isArray(order.items) ? order.items : [];
  const ref = orderRef(order);
  const total = orderTotalOf(order);
  const code = pickupCodeOf(order);
  const responseWindow = useAcceptanceWindow(order);
  const expired = responseWindow.expired;
  // Commission is a bill-breakdown figure; the row is dropped when the backend
  // capability is off, so an unverified commission is never shown (Step 5).
  const rows = billRows(order).filter((r) => caps.billBreakdown || r.label !== 'Platform commission');
  const pct = commissionPctOf(order);
  const mode = paymentModeOf(order);
  const loyalty = loyaltyLine(order);
  const stamp = ticketStamp(order);
  const note =
    order.customerInstructions || order.instructions || order.deliveryInstructions || order.restaurantNote;
  const selfDelivery = deliveryMode === 'self_delivery' || order.deliveryModeSnapshot === 'self_delivery';
  const finished = FINISHED_STATUSES.has(order.status);
  const extended = extendedIds?.has(order._id) ?? false;

  const known = items.map((i) => dietOf(i)).filter(Boolean) as ('veg' | 'nonveg')[];
  const vegOnly = known.length > 0 && known.every((d) => d === 'veg');
  // A lapsed response window blocks accept/reject on a placed card, matching the
  // legacy disabled state; the scheduled card's sheet handles its own gating.
  const placedDisabled = busy || expired;

  async function copyRef() {
    try {
      await navigator.clipboard?.writeText(ref);
    } catch {
      /* clipboard unavailable — nothing to do */
    }
  }

  let footer: React.ReactNode = null;
  if (hideFooter) footer = null;
  else switch (order.status) {
    case 'placed':
      footer = (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={placedDisabled}
            onClick={() => onReject(order)}
            className="min-h-[52px] flex-1 rounded-btn border-2 border-border text-base font-bold text-ink disabled:opacity-50"
          >
            Reject
          </button>
          {/* Accept is twice the width of Reject: the likelier tap gets the bigger target. */}
          <button
            type="button"
            disabled={placedDisabled}
            onClick={() => onAccept(order)}
            className="min-h-[52px] flex-[2] rounded-btn bg-success text-base font-extrabold text-white shadow-sm disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      );
      break;
    case 'confirmed':
      footer = (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdvance(order)}
          className={cn(PRIMARY_BTN, 'mt-3 bg-info')}
        >
          Start preparing
        </button>
      );
      break;
    case 'preparing':
      footer = <ReadyButton order={order} busy={busy} onReady={onReady} />;
      break;
    case 'waiting_for_rider':
      footer = (
        <div className="mt-3">
          <StatusPill tone="warning" dot>
            Food ready · Finding a rider…
          </StatusPill>
        </div>
      );
      break;
    case 'assigned':
      footer = (
        <div className="mt-3">
          <StatusPill tone="info" dot>
            Rider assigned
          </StatusPill>
        </div>
      );
      break;
    case 'out_for_delivery':
      footer =
        selfDelivery ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onVerifyOtp(order)}
            className={cn(PRIMARY_BTN, 'mt-3 bg-info')}
          >
            Verify delivery PIN
          </button>
        ) : (
          <div className="mt-3">
            <StatusPill tone="info" dot>
              Picked up · Out for delivery
            </StatusPill>
          </div>
        );
      break;
    case 'otp_verified':
      footer = (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdvance(order)}
          className={cn(PRIMARY_BTN, 'mt-3 bg-info')}
        >
          Mark delivered
        </button>
      );
      break;
    case 'delivered':
      footer = (
        <div className="mt-3">
          <StatusPill tone="success">Delivered</StatusPill>
        </div>
      );
      break;
    case 'cancelled':
      footer = (
        <div className="mt-3">
          <StatusPill tone="danger">Cancelled</StatusPill>
        </div>
      );
      break;
    default:
      footer = (
        <div className="mt-3">
          <StatusPill tone="neutral">{enumLabel(order.status)}</StatusPill>
        </div>
      );
  }

  return (
    <article className="w-full bg-card px-4 py-4" aria-label={`Order ${ref}`}>
      {/* Row 1: ID + copy | time | kebab menu */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-base font-extrabold text-ink">
          <span className="truncate">ID: {ref}</span>
          <button
            type="button"
            onClick={() => void copyRef()}
            aria-label="Copy order ID"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-btn text-ink-faint hover:text-ink"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {stamp ? <time className="text-xs text-ink-soft">{stamp}</time> : null}
          <ActionMenu
            order={order}
            extended={extended}
            busy={busy}
            onKot={onKot}
            onSpeak={onSpeak}
            onSupport={onSupport}
            onExtendPrep={onExtendPrep}
          />
        </span>
      </div>

      {/* Row 2: filled status badge (server text, raw) + loyalty line */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <StatusPill tone={statusTone(order.status)} className="uppercase">
          {enumLabel(order.status)}
        </StatusPill>
        {loyalty ? <span className="text-[13px] font-semibold text-info-ink">{loyalty}</span> : null}
        {code ? <StatusPill tone="neutral">PICKUP #{code}</StatusPill> : null}
      </div>

      <TicketStrips order={order} />

      {order.status === 'placed' && responseWindow.active ? (
        <ResponseCountdown
          order={order}
          remaining={responseWindow.remaining}
          deadline={responseWindow.deadline}
          expired={expired}
        />
      ) : null}

      <div className="mt-3">
        {items.length ? (
          finished ? (
            <details>
              <summary className="min-h-tap cursor-pointer py-2 text-sm font-semibold text-ink-soft">
                {items.length} item{items.length === 1 ? '' : 's'}
              </summary>
              <ul className="divide-y divide-border-soft">
                {items.map((item, i) => (
                  <ItemRow key={i} item={item} onOpenDetail={setDetailItem} />
                ))}
              </ul>
            </details>
          ) : (
            <>
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">
                {items.length} item{items.length === 1 ? '' : 's'}
              </p>
              <ul className="divide-y divide-border-soft">
                {items.map((item, i) => (
                  <ItemRow key={i} item={item} onOpenDetail={setDetailItem} />
                ))}
              </ul>
            </>
          )
        ) : (
          <p className="text-sm text-ink-faint">No items listed</p>
        )}
      </div>

      {vegOnly ? (
        <p className="mt-2 text-sm font-extrabold uppercase tracking-wide text-success-ink">Veg only order</p>
      ) : null}

      {note ? (
        <p className="mt-2 flex items-start gap-2 rounded-btn bg-warning-bg px-3 py-2 text-sm font-semibold text-warning-ink">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{String(note)}</span>
        </p>
      ) : null}

      <PrepStrip order={order} />
      <RiderBox order={order} />

      {order.status === 'cancelled' && order.cancelReason ? (
        <p className="mt-2 rounded-btn bg-danger-bg px-3 py-2 text-sm text-danger-ink">
          <strong>Reason </strong>
          {order.cancelReason}
        </p>
      ) : null}

      {/* Total bill + payment chip + expandable breakdown */}
      <div className="mt-3 rounded-btn border border-border-soft">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
            Total Bill
            {mode ? (
              <span
                className={cn(
                  'rounded-pill px-2 py-0.5 text-[11px] font-extrabold uppercase',
                  mode === 'upi' ? 'bg-success-bg text-success-ink' : 'bg-warning-bg text-warning-ink',
                )}
              >
                {mode === 'upi' ? 'PAID' : 'COD'}
              </span>
            ) : null}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="text-base font-extrabold tabular-nums text-ink">
              {total !== null ? formatMoney(total) : '—'}
            </span>
            {rows.length ? (
              <button
                type="button"
                aria-label="Show bill breakdown"
                aria-expanded={billOpen}
                aria-controls={billId}
                onClick={() => setBillOpen((v) => !v)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-btn text-ink-soft"
              >
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform duration-200', billOpen && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>
            ) : null}
          </span>
        </div>
        {billOpen && rows.length ? (
          <dl id={billId} className="space-y-1.5 border-t border-border-soft px-3 py-2 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-3">
                <dt className={cn('text-ink-soft', row.kind === 'total' && 'font-bold text-ink')}>
                  {row.label}
                  {row.label === 'Platform commission' && pct !== null ? ` (${pct}%)` : ''}
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
        ) : null}
      </div>

      {footer}

      {detailItem ? <ItemDetailSheet item={detailItem} onClose={() => setDetailItem(null)} /> : null}
    </article>
  );
}
