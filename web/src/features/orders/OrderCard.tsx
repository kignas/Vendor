import { useId, useState } from 'react';
import {
  CalendarClock,
  ChevronDown,
  Clock3,
  LifeBuoy,
  MessageSquare,
  Printer,
  Timer,
  Utensils,
  Volume2,
} from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { DietMark } from '@/components/DietMark';
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

/**
 * Finished orders collapse their item list; live orders always show it.
 */
const FINISHED_STATUSES = new Set(['delivered', 'cancelled']);

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

/** Shared sizing for the one main action on every card. */
const PRIMARY_BTN =
  'min-h-[52px] w-full rounded-btn text-base font-extrabold text-white disabled:opacity-50';

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
      className="relative mt-3 min-h-[52px] w-full overflow-hidden rounded-btn border-2 border-brand-ink bg-card text-base font-extrabold text-brand-ink disabled:opacity-50"
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
    <div className="mt-2 flex flex-wrap gap-2">
      {cutleryText ? (
        <p className="inline-flex items-start gap-1.5 rounded-btn bg-canvas px-2.5 py-1.5 text-[13px] text-ink-soft">
          <Utensils className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{cutleryText}</span>
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

function ItemRow({ item }: { item: OrderItem }) {
  const qty = Number(item.quantity) || 1;
  return (
    <li className="flex items-start gap-2.5 py-2">
      <DietMark item={item} />
      <span className="w-8 shrink-0 text-base font-extrabold tabular-nums text-ink">{qty}×</span>
      <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-ink">
        {item.name || 'Item'}
      </span>
    </li>
  );
}

function ItemList({ items }: { items: OrderItem[] }) {
  return (
    <ul className="divide-y divide-border-soft">
      {items.map((item, i) => (
        <ItemRow key={i} item={item} />
      ))}
    </ul>
  );
}

/**
 * Response countdown for a new order. Calm amber while there is time, red in the
 * final minute and once it lapses, with a thin bar that drains so the urgency is
 * visible at a glance. The bar is derived from the same server deadline; it is
 * omitted when the order has no usable created time.
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
 * A single order card. Renders only fields the server supplies — the total,
 * bill breakdown, payment mode, commission and rider state each appear only
 * when the corresponding server data exists (never invented).
 *
 * Layout, top to bottom: what the kitchen must cook (items, then the customer
 * note) comes first, then the total, then ONE main action. Reference material
 * (bill breakdown, KOT, voice readout, help) sits behind a "More" toggle so it
 * does not push the main action off screen.
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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();

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
  const finished = FINISHED_STATUSES.has(order.status);

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
            className="min-h-[52px] flex-1 rounded-btn border-2 border-border text-base font-bold text-ink disabled:opacity-50"
          >
            Reject
          </button>
          {/* Accept is twice the width of Reject: the likelier tap gets the bigger target. */}
          <button
            type="button"
            disabled={disabled}
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
          className={cn(PRIMARY_BTN, 'mt-3 bg-brand')}
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
            className={cn(PRIMARY_BTN, 'mt-3 bg-brand')}
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
          className={cn(PRIMARY_BTN, 'mt-3 bg-brand')}
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
    <article
      className={cn(
        'w-full bg-card px-4 py-4',
        order.status === 'placed' && 'shadow-sm',
      )}
      aria-label={`Order ${ref}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-extrabold text-ink">#{ref}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px] text-ink-soft">
            <span className="font-semibold text-ink">{loyaltySubtitle(order)}</span>
            {stamp ? (
              <time className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                {stamp}
              </time>
            ) : null}
            {count !== null ? <span className="text-ink-faint">{count} with you</span> : null}
          </div>
        </div>
        {code ? <StatusPill tone="neutral">PICKUP #{code}</StatusPill> : null}
      </div>

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
              <ItemList items={items} />
            </details>
          ) : (
            <>
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">
                {items.length} item{items.length === 1 ? '' : 's'}
              </p>
              <ItemList items={items} />
            </>
          )
        ) : (
          <p className="text-sm text-ink-faint">No items listed</p>
        )}
      </div>

      {note ? (
        <p className="mt-2 flex items-start gap-2 rounded-btn bg-warning-bg px-3 py-2 text-sm font-semibold text-warning-ink">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{String(note)}</span>
        </p>
      ) : null}

      <PrepStrip
        order={order}
        extended={extendedIds?.has(order._id) ?? false}
        onExtend={onExtendPrep}
        busy={busy}
      />

      <TicketStrips order={order} />
      <RiderStatus order={order} />

      {order.status === 'cancelled' && order.cancelReason ? (
        <p className="mt-2 rounded-btn bg-danger-bg px-3 py-2 text-sm text-danger-ink">
          <strong>Reason </strong>
          {order.cancelReason}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border-soft pt-3">
        <span className="text-2xl font-extrabold tabular-nums text-ink">
          {total !== null ? formatMoney(total) : '—'}
        </span>
        {mode ? (
          <StatusPill tone={mode === 'upi' ? 'success' : 'neutral'}>
            {mode === 'upi' ? 'Paid online' : 'COD'}
          </StatusPill>
        ) : null}
      </div>

      {footer}

      <button
        type="button"
        onClick={() => setMoreOpen((v) => !v)}
        aria-expanded={moreOpen}
        aria-controls={moreId}
        className="mt-1 flex min-h-tap w-full items-center justify-center gap-1 text-[13px] font-semibold text-ink-soft"
      >
        {moreOpen ? 'Less' : 'More'}
        <ChevronDown
          className={cn('h-4 w-4 transition-transform duration-200', moreOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {moreOpen ? (
        <div id={moreId} className="border-t border-border-soft pt-3">
          {rows.length ? (
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">
                Bill breakdown
              </p>
              <dl className="mt-1.5 space-y-1.5 text-sm">
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
            </div>
          ) : (
            <p className="text-xs text-ink-faint">
              {Object.keys(bill).length ? null : 'A detailed breakdown is not available for this order.'}
            </p>
          )}

          <div className="mt-3 flex gap-2 text-[13px]">
            <button
              type="button"
              onClick={() => onKot?.(order)}
              className="inline-flex min-h-tap flex-1 items-center justify-center gap-1.5 rounded-btn border border-border font-semibold text-ink-soft"
              aria-label="Print KOT"
            >
              <Printer className="h-4 w-4" aria-hidden="true" /> KOT
            </button>
            <button
              type="button"
              onClick={() => onSpeak?.(order)}
              className="inline-flex min-h-tap flex-1 items-center justify-center gap-1.5 rounded-btn border border-border font-semibold text-ink-soft"
              aria-label="Voice readout"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" /> Read
            </button>
            <button
              type="button"
              onClick={() => onSupport?.(order)}
              className="inline-flex min-h-tap flex-1 items-center justify-center gap-1.5 rounded-btn border border-border font-semibold text-ink-soft"
              aria-label="Order support"
            >
              <LifeBuoy className="h-4 w-4" aria-hidden="true" /> Help
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
