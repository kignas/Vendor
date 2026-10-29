import { useEffect, useState } from 'react';
import { Minus, Plus, Timer } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { orderRef } from '@/features/orders/orderDomain';
import { formatCountdown, useAcceptanceWindow } from '@/features/orders/acceptanceWindow';
import { cn } from '@/lib/cn';
import {
  PREP_MAX,
  PREP_MIN,
  PREP_QUICK_CHOICES,
  PREP_STEP,
  clampPrepMinutes,
} from '@/features/orders/prepTime';
import type { Order } from '@/types/order';

/**
 * Order acceptance sheet. Mirrors the legacy `#prepSheet` and the reference
 * layout: the item list, customer instructions and total bill are shown so the
 * vendor decides with full context, a minus/plus stepper picks the kitchen prep
 * time (KPT), and a clearly separated Reject (outline) and green Accept action
 * close it out. The accept is single-flight — a double tap cannot fire twice —
 * and the countdown is only shown when the server supplied a deadline.
 */
export function AcceptOrderSheet({
  order,
  busy,
  defaultMinutes = 20,
  onAccept,
  onReject,
  onClose,
}: {
  order: Order | null;
  busy: boolean;
  /** Kitchen Rush Mode shifts the default KPT (legacy defaultPrepMinutes). */
  defaultMinutes?: number;
  onAccept: (order: Order, prepMinutes: number) => void;
  onReject: (order: Order) => void;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState(defaultMinutes);

  // Reset the stepper to the current default whenever a new order is opened.
  useEffect(() => {
    if (order) setMinutes(defaultMinutes);
  }, [order, defaultMinutes]);

  const window = useAcceptanceWindow(order ?? ({ status: '' } as Order));
  const items = Array.isArray(order?.items) ? order.items : [];
  const note =
    order?.customerInstructions || order?.instructions || order?.deliveryInstructions;
  const ref = order ? orderRef(order) : '';

  if (!order) return null;

  return (
    <Sheet
      onClose={onClose}
      title="Accept order"
      description={`Order #${ref}`}
    >
      <div className="space-y-3">
        {window.active ? (
          <p
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-btn px-3 py-2 text-sm font-bold tabular-nums',
              window.expired ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning',
            )}
            aria-live="polite"
          >
            <Timer className="h-4 w-4" aria-hidden="true" />
            {window.expired
              ? 'Response window expired · updating…'
              : `Respond within ${formatCountdown(window.remaining)}`}
          </p>
        ) : null}

        {items.length ? (
          <ul className="max-h-40 overflow-y-auto rounded-btn border border-border-soft px-3 py-1">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 py-1 text-sm">
                <span className="w-6 shrink-0 font-bold tabular-nums text-ink-soft">
                  {Number(item.quantity) || 1}×
                </span>
                <span className="min-w-0 flex-1 text-ink">{item.name || 'Item'}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {note ? (
          <p className="rounded-btn bg-warning-bg px-2 py-1.5 text-xs text-warning">{String(note)}</p>
        ) : null}

        <div>
          <p className="text-xs font-semibold text-ink-soft">
            Kitchen prep time (KPT) · the customer and rider see this
          </p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              aria-label="Decrease prep time"
              disabled={busy || minutes <= PREP_MIN}
              onClick={() => setMinutes((m) => clampPrepMinutes(m - PREP_STEP))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-border text-ink disabled:opacity-40"
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
            <span
              data-testid="prep-minutes"
              className="min-w-24 text-center text-lg font-extrabold tabular-nums text-ink"
            >
              {minutes} min
            </span>
            <button
              type="button"
              aria-label="Increase prep time"
              disabled={busy || minutes >= PREP_MAX}
              onClick={() => setMinutes((m) => clampPrepMinutes(m + PREP_STEP))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-border text-ink disabled:opacity-40"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {PREP_QUICK_CHOICES.map((min) => (
              <button
                key={min}
                type="button"
                disabled={busy}
                aria-pressed={min === minutes}
                onClick={() => setMinutes(min)}
                className={cn(
                  'min-h-tap rounded-pill border px-3 text-xs font-semibold',
                  min === minutes
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-border text-ink-soft',
                )}
              >
                {min} min
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => onReject(order)}
            className="min-h-tap flex-1 rounded-btn border-2 border-danger font-bold text-danger disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={busy || window.expired}
            onClick={() => onAccept(order, minutes)}
            className="inline-flex min-h-tap flex-1 items-center justify-center gap-1.5 rounded-btn bg-success font-bold text-white shadow-sm disabled:opacity-50"
          >
            {busy ? 'Accepting…' : 'Accept'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
