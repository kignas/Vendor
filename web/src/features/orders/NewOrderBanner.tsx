import { useEffect, useRef, useState } from 'react';
import { BellRing } from 'lucide-react';
import { useNow } from '@/hooks/useNow';
import { responseDeadlineOf } from '@/features/orders/orderDomain';
import { orderAlarm } from '@/services/notifications/alarm';
import { ORDER_STATUS, type Order } from '@/types/order';

/**
 * Prominent new-order banner. Mirrors the legacy `#alarmBar`: it appears while
 * new (placed, unscheduled) orders are waiting, names how many, and disappears
 * once nothing is waiting.
 *
 * Two actions, because they are different intents:
 *   - "View order(s)" is the main one. It calls `onStop`, which the Orders page
 *     uses to silence the alarm AND jump to the New tab — the vendor wants to
 *     see the order, not just stop the noise.
 *   - "Stop alarm" only silences the chime/vibration and stays on the current
 *     view, for a vendor who is mid-task and will get to the order in a moment.
 *
 * The chime/vibration itself is owned by `orderAlarm`; this only renders it and
 * asks the page to refresh the moment an acceptance window lapses.
 */
export function NewOrderBanner({
  orders,
  onStop,
  onExpired,
}: {
  orders: Order[];
  /** Silence the alarm and show the waiting orders (the main action). */
  onStop: () => void;
  onExpired?: () => void;
}) {
  const waiting = orders.filter((o) => o.status === ORDER_STATUS.placed);
  const count = waiting.length;

  // The count the vendor silenced the alarm for. A new order raises the count,
  // which un-silences the label (the alarm restarts for it).
  const [silencedFor, setSilencedFor] = useState<number | null>(null);
  const silenced = silencedFor === count;

  // Tick while any waiting order has a live acceptance deadline so we can
  // refresh the instant one lapses (legacy `startOrderResponseTimer`).
  const soonest = waiting.reduce<number>((min, o) => {
    const d = responseDeadlineOf(o);
    return d > 0 && (min === 0 || d < min) ? d : min;
  }, 0);
  const now = useNow(1000, soonest > 0);
  const expired = soonest > 0 && now >= soonest;

  const firedRef = useRef(false);
  useEffect(() => {
    if (!expired) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;
    onExpired?.();
  }, [expired, onExpired]);

  if (count === 0) return null;

  return (
    <div
      key={count}
      className="-mx-4 mb-1 rounded-card bg-warning px-4 py-3 text-white shadow-md motion-safe:animate-attention-pulse"
    >
      <p role="alert" aria-live="assertive" className="flex items-center gap-3 text-base font-extrabold">
        <BellRing className="h-6 w-6 shrink-0" aria-hidden="true" />
        <span className="flex-1">
          {count > 1 ? `${count} new orders waiting` : 'New order waiting'}
          {expired ? <span className="font-semibold"> · updating…</span> : null}
        </span>
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onStop}
          className="min-h-[48px] flex-[2] rounded-btn bg-white text-base font-extrabold text-warning"
        >
          {count > 1 ? 'View orders' : 'View order'}
        </button>
        <button
          type="button"
          disabled={silenced}
          onClick={() => {
            orderAlarm.stop();
            setSilencedFor(count);
          }}
          className="min-h-[48px] flex-1 rounded-btn border-2 border-white/70 text-sm font-bold text-white disabled:opacity-70"
        >
          {silenced ? 'Alarm stopped' : 'Stop alarm'}
        </button>
      </div>
    </div>
  );
}
