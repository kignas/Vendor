import { CalendarClock, Clock3, LifeBuoy, MessageSquare, Printer, Utensils, Volume2 } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { enumLabel, formatMoney, kptPct } from '@/lib/format';
import { cn } from '@/lib/cn';
import { formatCountdown, useAcceptanceWindow } from '@/features/orders/acceptanceWindow';
import { caps } from '@/lib/caps';
import { useNow } from '@/hooks/useNow';
import { PrepStrip } from '@/features/orders/PrepStrip';
import { RiderStatus } from '@/features/orders/RiderStatus';
import {
  billRows,
  commissionPctOf,
  dietOf,
  loyaltySubtitle,
  orderBillOf,
  orderCountWithRestaurant,
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

/**
 * Ready CTA with the shared prep deadline. Mirrors the legacy split-fill
 * `startKptTimer` label: "Order Ready (mm:ss)" while the deadline is in the
 * future, plain "Order Ready" otherwise. The button is never disabled by the
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
      className="relative mt-3 min-h-tap w-full overflow-hidden rounded-btn border border-brand-ink bg-card text-sm font-bold text-brand-ink disabled:opacity-50"
    >
      <span
        className="absolute inset-y-0 left-0 bg-brand/10"
        style={{ width: `${showTimer ? pct : 100}%` }}
        aria-hidden="true"
      />
      <span className="relative">
        {showTimer ? `Order Ready (${mmss(remaining)})` : 'Order Ready'}
      </span>
    </button>
  );
}

function DietMark({ item }: { item: OrderItem }) {
  const diet = dietOf(item);
  if (!diet) return null;
  return (
    <span
      className={cn(
        'shrink-0 rounded-[3px] border px-1 text-[10px] font-bold leading-4',
        diet === 'veg' ? 'border-success text-success-ink' : 'border-danger text-danger-ink',
      )}
    >
      {diet === 'veg' ? 'VEG' : 'NON'}
    </span>
  );
}

/**
 * Cutlery preference and scheduled-slot strips. Mirrors the legacy
 * `renderTicket` stripHtml block: cutlery is read from the several server field
 * aliases and only rendered when explicitly sent; a scheduled slot is shown
 * only for a future delivery time.
 */
function TicketStrips({ order }: { order: Order }) {
  const cutlery =
    order.sendCutlery ?? order.cutlery ?? order.cutleryPreference ?? order.cutleryRequired;
  const slotAt = scheduledAtOf(order);
  const now = useNow(30_000, slotAt !== null && slotAt > Date.now());

  let cutleryText: string | null = null;
  if (cutlery === true) cutleryText = 'Send cutlery';
  else if (cutlery === false) cutleryText = 'No cutlery needed';
  else if (typeof cutlery === 'string' && cutlery.trim()) cutleryText = `Cutlery: ${cutlery.trim()}`;

  const showSlot = slotAt !== null && slotAt > now;
  if (!cutleryText && !showSlot) return null;

  return (
    <>
      {cutleryText ? (
        <p className="mt-2 inline-flex items-start gap-1 rounded-btn bg-canvas px-2 py-1.5 text-xs text-ink-soft">
          <Utensils className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{cutleryText}</span>
        </p>
      ) : null}
      {showSlot ? (
        <p className="mt-2 inline-flex items-start gap-1 rounded-btn bg-info-bg px-2 py-1.5 text-xs text-info-ink">
          <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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
    </>
  );
}

function ItemRow({ item }: { item: OrderItem }) {
  const qty = Number(item.quantity) || 1;
  return (
    <li className="flex items-start gap-2 py-1.5">
      <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-ink-soft">{qty}×</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{item.name || 'Item'}</span>
      </span>
      <DietMark item={item} />
    </li>
  );
}

/**
 * A single order card. Renders only fields the server supplies — the total,
 * bill breakdown, payment mode, commission and rider state each appear only
 * when the corresponding server data exists (never invented).
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
  const items = Array.isArray(order.items) ? order.items : [];
  const ref = orderRef(order);
  const total = orderTotalOf(order);
  const code = pickupCodeOf(order);
  const responseWindow = useAcceptanceWindow(order);
  const expired = responseWindow.expired;
  const rows = billRows(order);
  const bill = orderBillOf(order) ?? {};
  const pct = commissionPctOf(order);
  const mode = paymentModeOf(order);
  const count = orderCountWithRestaurant(order);
  const stamp = ticketStamp(order);
  const note =
    order.customerInstructions || order.instructions || order.deliveryInstructions || order.restaurantNote;
  const selfDelivery = deliveryMode === 'self_delivery' || order.deliveryModeSnapshot === 'self_delivery';

  const disabled = busy || expired;

  let footer: React.ReactNode = null;
  if (hideFooter) footer = null;
  else switch (order.status) {
    case 'placed':
      footer = (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onReject(order)}
            className="min-h-tap flex-1 rounded-btn border border-border text-sm font-bold text-ink disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAccept(order)}
            className="min-h-tap flex-1 rounded-btn bg-success text-sm font-bold text-white shadow-sm disabled:opacity-50"
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
          className="mt-3 min-h-tap w-full rounded-btn bg-brand text-sm font-bold text-white disabled:opacity-50"
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
        <StatusPill tone="warning" dot>
          Food ready · Finding a rider…
        </StatusPill>
      );
      break;
    case 'assigned':
      footer = (
        <StatusPill tone="info" dot>
          Rider assigned
        </StatusPill>
      );
      break;
    case 'out_for_delivery':
      footer =
        selfDelivery ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onVerifyOtp(order)}
            className="mt-3 min-h-tap w-full rounded-btn bg-brand text-sm font-bold text-white disabled:opacity-50"
          >
            Verify delivery PIN
          </button>
        ) : (
          <StatusPill tone="info" dot>
            Picked up · Out for delivery
          </StatusPill>
        );
      break;
    case 'otp_verified':
      footer = (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdvance(order)}
          className="mt-3 min-h-tap w-full rounded-btn bg-brand text-sm font-bold text-white disabled:opacity-50"
        >
          Mark delivered
        </button>
      );
      break;
    case 'delivered':
      footer = <StatusPill tone="success">Delivered</StatusPill>;
      break;
    case 'cancelled':
      footer = <StatusPill tone="danger">Cancelled</StatusPill>;
      break;
    default:
      footer = <StatusPill tone="neutral">{enumLabel(order.status)}</StatusPill>;
  }

  return (
    <article
      className={cn(
        'rounded-card border bg-card p-4 shadow-sm',
        order.status === 'placed' ? 'border-brand-ink/40 ring-1 ring-brand-ink/20' : 'border-border',
      )}
      aria-label={`Order ${ref}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {code ? (
            <StatusPill tone="neutral">PICKUP #{code}</StatusPill>
          ) : null}
          {count !== null ? (
            <span className="text-[11px] font-medium text-ink-faint">{count} with you</span>
          ) : null}
        </div>
        {order.status === 'placed' ? (
          <span
            className={cn(
              'text-[11px] font-semibold tabular-nums',
              expired ? 'text-danger-ink' : 'text-ink-soft',
            )}
            aria-live="polite"
          >
            {!responseWindow.active
              ? null
              : expired
                ? 'Response window expired · updating…'
                : `Respond within ${formatCountdown(responseWindow.remaining)}`}
          </span>
        ) : null}
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-2">
        <h3 className="text-base font-extrabold text-ink">#{ref}</h3>
        <span className="text-xs font-semibold text-ink-soft tabular-nums">#{ref}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <span className="font-semibold text-ink">{loyaltySubtitle(order)}</span>
        {stamp ? (
          <time className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" aria-hidden="true" />
            {stamp}
          </time>
        ) : null}
      </div>

      {items.length ? (
        <details className="mt-2" open={order.status === 'placed'}>
          <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
            {items.length} item{items.length === 1 ? '' : 's'}
          </summary>
          <ul className="mt-1 divide-y divide-border-soft">
            {items.map((item, i) => (
              <ItemRow key={i} item={item} />
            ))}
          </ul>
        </details>
      ) : (
        <p className="mt-2 text-xs text-ink-faint">No items listed</p>
      )}

      <PrepStrip
        order={order}
        extended={extendedIds?.has(order._id) ?? false}
        onExtend={onExtendPrep}
        busy={busy}
      />

      <TicketStrips order={order} />
      <RiderStatus order={order} />

      {note ? (
        <p className="mt-2 inline-flex items-start gap-1 rounded-btn bg-warning-bg px-2 py-1.5 text-xs text-warning-ink">
          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{String(note)}</span>
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3">
        <span className="text-lg font-extrabold tabular-nums text-ink">
          {total !== null ? formatMoney(total) : '—'}
        </span>
        {mode ? (
          <StatusPill tone={mode === 'upi' ? 'success' : 'neutral'}>
            {mode === 'upi' ? 'Paid online' : 'COD'}
          </StatusPill>
        ) : null}
      </div>

      {rows.length ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
            Bill breakdown
          </summary>
          <dl className="mt-1 space-y-1 text-xs">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between">
                <dt className={cn(row.kind === 'total' && 'font-bold text-ink')}>
                  {row.label}
                  {row.label === 'Platform commission' && pct !== null ? ` (${pct}%)` : ''}
                </dt>
                <dd
                  className={cn(
                    'tabular-nums',
                    row.kind === 'total' && 'font-bold text-ink',
                    row.kind === 'neg' && 'text-ink-soft',
                  )}
                >
                  {row.kind === 'neg' ? '−' : ''}
                  {formatMoney(Math.abs(row.value))}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ) : (
        <p className="mt-2 text-[11px] text-ink-faint">
          {bill && Object.keys(bill).length
            ? null
            : 'A detailed breakdown is not available for this order.'}
        </p>
      )}

      {order.status === 'cancelled' && order.cancelReason ? (
        <p className="mt-2 rounded-btn bg-danger-bg px-2 py-1.5 text-xs text-danger-ink">
          <strong>Reason </strong>
          {order.cancelReason}
        </p>
      ) : null}

      {footer}

      <div className="mt-3 flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => onKot?.(order)}
          className="inline-flex min-h-tap flex-1 items-center justify-center gap-1 rounded-btn border border-border text-ink-soft"
          aria-label="Print KOT"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden="true" /> KOT
        </button>
        <button
          type="button"
          onClick={() => onSpeak?.(order)}
          className="inline-flex min-h-tap flex-1 items-center justify-center gap-1 rounded-btn border border-border text-ink-soft"
          aria-label="Voice readout"
        >
          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" /> Read
        </button>
        <button
          type="button"
          onClick={() => onSupport?.(order)}
          className="inline-flex min-h-tap flex-1 items-center justify-center gap-1 rounded-btn border border-border text-ink-soft"
          aria-label="Order support"
        >
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" /> Help
        </button>
      </div>
    </article>
  );
}
