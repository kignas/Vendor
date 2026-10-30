import { useEffect, useState } from 'react';
import { ChevronDown, Copy, Minus, Plus, Timer, Utensils, X } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { DietMark } from '@/components/DietMark';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import {
  billRows,
  cutleryOptOut,
  dietOf,
  itemPriceOf,
  loyaltyLine,
  orderRef,
  orderTotalOf,
  paymentModeOf,
  ticketStamp,
} from '@/features/orders/orderDomain';
import { formatCountdown, useAcceptanceWindow } from '@/features/orders/acceptanceWindow';
import { PREP_MAX, PREP_MIN, PREP_STEP, clampPrepMinutes } from '@/features/orders/prepTime';
import type { Order, OrderItem } from '@/types/order';

/**
 * Order acceptance sheet. Mirrors the legacy `#prepSheet` and the reference
 * layout: the item list, customer instructions and total bill are shown so the
 * vendor decides with full context, a bordered minus/plus stepper picks the
 * kitchen prep time (KPT), and a clearly separated Reject (outline) and green
 * Accept action close it out. The accept is single-flight — a double tap cannot
 * fire twice — and the countdown is only shown when the server supplied a
 * deadline.
 *
 * Every value here comes from the server; a missing field is hidden rather than
 * guessed (AGENTS.md rules 2 & 5). The cutlery and "VEG ONLY" tags follow the
 * rules in PHASE-3-ZOMATO-LAYOUT.md Step 4.
 */
export function AcceptOrderSheet({
  order,
  busy,
  defaultMinutes = 20,
  index = 0,
  total = 1,
  onAccept,
  onReject,
  onClose,
  onPrev,
  onNext,
}: {
  order: Order | null;
  busy: boolean;
  /** Kitchen Rush Mode shifts the default KPT (legacy defaultPrepMinutes). */
  defaultMinutes?: number;
  /** Position of this order in the waiting set, for the "1 of N" pager. */
  index?: number;
  total?: number;
  onAccept: (order: Order, prepMinutes: number) => void;
  onReject: (order: Order) => void;
  onClose: () => void;
  /** Move to the previous/next waiting order when several are queued. */
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [billOpen, setBillOpen] = useState(false);

  // Reset the stepper and bill disclosure whenever a new order is opened.
  useEffect(() => {
    if (order) {
      setMinutes(defaultMinutes);
      setBillOpen(false);
    }
  }, [order, defaultMinutes]);

  const window = useAcceptanceWindow(order ?? ({ status: '' } as Order));
  const items = Array.isArray(order?.items) ? order.items : [];
  const note = order?.customerInstructions || order?.instructions || order?.deliveryInstructions;
  const ref = order ? orderRef(order) : '';

  if (!order) return null;

  const rows = billRows(order);
  const total_amount = orderTotalOf(order);
  const mode = paymentModeOf(order);
  const loyalty = loyaltyLine(order);
  const cutlery = cutleryOptOut(order);
  const known = items.map((i) => dietOf(i)).filter(Boolean) as ('veg' | 'nonveg')[];
  const vegOnly = known.length > 0 && known.every((d) => d === 'veg');
  const stamp = ticketStamp(order);
  // The countdown (and its drain fill) is shown ONLY when the server supplied a
  // deadline; the legacy created+5min fallback still drives expiry, but it never
  // invents a visible timer of its own (Step 4).
  const showCountdown = window.active && Boolean(order.restaurantResponseDeadline);
  const fillPct =
    showCountdown && window.total > 0
      ? Math.max(0, Math.min(100, (window.remaining / window.total) * 100))
      : null;

  async function copyRef() {
    try {
      await navigator.clipboard?.writeText(ref);
    } catch {
      /* clipboard unavailable — nothing to do */
    }
  }

  const header = (
    <div className="flex items-center justify-between gap-2 bg-success px-5 py-3.5 text-white">
      <div className="min-w-0">
        <p className="text-base font-extrabold">
          {total > 1 ? `${total} new orders` : '1 new order'}
        </p>
        {total > 1 ? (
          <p className="text-xs font-semibold text-white/85">
            {index + 1} of {total}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-mr-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-white hover:bg-white/15"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );

  // Pinned footer: the response window (when the server sent a deadline), the
  // 1-of-N pager, and the Reject / Accept actions. It never scrolls, so the
  // buttons are always reachable no matter how many items are in the order.
  const footer = (
    <div className="space-y-2">
      {total > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={index <= 0}
            onClick={onPrev}
            className="min-h-tap flex-1 rounded-btn border border-border text-sm font-semibold text-ink-soft disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs font-semibold text-ink-soft">
            {index + 1} of {total}
          </span>
          <button
            type="button"
            disabled={index >= total - 1}
            onClick={onNext}
            className="min-h-tap flex-1 rounded-btn border border-border text-sm font-semibold text-ink-soft disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}

      {showCountdown ? (
        <p
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-btn px-3 py-2 text-sm font-bold tabular-nums',
            window.expired ? 'bg-danger-bg text-danger-ink' : 'bg-warning-bg text-warning-ink',
          )}
          aria-live="polite"
        >
          <Timer className="h-4 w-4" aria-hidden="true" />
          {window.expired
            ? 'Response window expired · updating…'
            : `Respond within ${formatCountdown(window.remaining)}`}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onReject(order)}
          className="min-h-tap rounded-btn border-2 border-danger px-5 text-sm font-bold text-danger-ink disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={busy || window.expired}
          onClick={() => onAccept(order, minutes)}
          className="relative inline-flex min-h-tap flex-1 items-center justify-center overflow-hidden rounded-btn bg-success text-base font-bold text-white shadow-sm disabled:opacity-50"
        >
          {fillPct !== null ? (
            <span
              data-testid="accept-fill"
              className="absolute inset-y-0 left-0 bg-white/20"
              style={{ width: `${fillPct}%` }}
              aria-hidden="true"
            />
          ) : null}
          <span className="relative">
            {busy
              ? 'Accepting…'
              : showCountdown
                ? `Accept (${formatCountdown(window.remaining)})`
                : 'Accept'}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <Sheet onClose={onClose} title="Accept order" hideHeader header={header} footer={footer}>
      <div className="space-y-3">
        {/* ID + copy, time on the right */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-base font-bold text-ink">
            ID: {ref}
            <button
              type="button"
              onClick={() => void copyRef()}
              aria-label="Copy order ID"
              className="-my-1.5 -mr-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-btn text-ink-soft hover:text-ink"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
          </span>
          {stamp ? <time className="text-[13px] text-ink-soft">{stamp}</time> : null}
        </div>

        {loyalty ? <p className="text-sm font-semibold text-info-ink">{loyalty}</p> : null}

        {cutlery ? (
          <p className="inline-flex items-start gap-1.5 rounded-btn border border-danger px-2.5 py-1.5 text-[13px] font-semibold text-danger-ink">
            <Utensils className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Don&rsquo;t send cutlery, tissues and straws</span>
          </p>
        ) : null}

        {/* Items */}
        {items.length ? (
          <ul className="max-h-48 overflow-y-auto rounded-btn border border-border-soft px-3 py-1">
            {items.map((item: OrderItem, i) => {
              const qty = Number(item.quantity) || 1;
              const price = itemPriceOf(item);
              return (
                <li key={i} className="flex items-start gap-2 py-1.5 text-sm">
                  <DietMark item={item} />
                  <span className="w-6 shrink-0 font-bold tabular-nums text-ink-soft">{qty}×</span>
                  <span className="min-w-0 flex-1 text-ink">{item.name || 'Item'}</span>
                  {price !== null ? (
                    <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink">
                      {formatMoney(price)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        {vegOnly ? (
          <p className="text-sm font-extrabold uppercase tracking-wide text-success-ink">
            Veg only order
          </p>
        ) : null}

        {note ? (
          <p className="rounded-btn bg-warning-bg px-2 py-1.5 text-xs text-warning-ink">
            {String(note)}
          </p>
        ) : null}

        {/* Total bill with PAID/COD chip and expandable breakdown */}
        <div className="rounded-btn border border-border-soft">
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
              <span className="text-[15px] font-semibold tabular-nums text-ink">
                {total_amount !== null ? formatMoney(total_amount) : '—'}
              </span>
              {rows.length ? (
                <button
                  type="button"
                  aria-label="Show bill breakdown"
                  aria-expanded={billOpen}
                  onClick={() => setBillOpen((v) => !v)}
                  className="-my-1 -mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-btn text-ink-soft"
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
            <dl className="space-y-1.5 border-t border-border-soft px-3 py-2 text-sm">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className={cn('text-ink-soft', row.kind === 'total' && 'font-bold text-ink')}>
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
          ) : null}
        </div>

        {/* Prep-time stepper */}
        <div>
          <p className="text-xs font-semibold text-ink-soft">
            Set food preparation time · the customer and rider see this
          </p>
          <div className="mt-2 flex items-center justify-between rounded-btn border border-border px-2">
            <button
              type="button"
              aria-label="Decrease prep time"
              disabled={busy || minutes <= PREP_MIN}
              onClick={() => setMinutes((m) => clampPrepMinutes(m - PREP_STEP))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-btn text-ink disabled:opacity-40"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span
              data-testid="prep-minutes"
              className="text-base font-extrabold tabular-nums text-ink"
            >
              {minutes} mins
            </span>
            <button
              type="button"
              aria-label="Increase prep time"
              disabled={busy || minutes >= PREP_MAX}
              onClick={() => setMinutes((m) => clampPrepMinutes(m + PREP_STEP))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-btn text-ink disabled:opacity-40"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
