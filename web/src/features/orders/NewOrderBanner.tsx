import { useEffect, useRef, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { useNow } from '@/hooks/useNow';
import { responseDeadlineOf } from '@/features/orders/orderDomain';
import { orderAlarm } from '@/services/notifications/alarm';
import { ORDER_STATUS, type Order } from '@/types/order';

/**
 * Fixed new-order bar (Phase 3, Step 4). A restyle of the previous banner, not
 * a rewrite: it still appears while new (`placed`) orders are waiting, still
 * names how many, and still asks the page to refresh the moment an acceptance
 * window lapses. The chime/vibration stays owned by `orderAlarm`.
 *
 * Tapping the bar (or swiping up on it) silences the alarm and opens the
 * new-order sheet — the vendor wants to see the order, not just stop the noise.
 * It sits above the bottom nav; the Orders page reserves space for it.
 */
export function NewOrderBanner({
  orders,
  onStop,
  onExpired,
}: {
  orders: Order[];
  /** Silence the alarm and open the new-order sheet (the main action). */
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

  // A short upward swipe opens the sheet, matching the reference gesture. The
  // tap path is unchanged, so this only ADDS an affordance.
  const touchStartY = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartY.current;
    touchStartY.current = null;
    const end = e.changedTouches[0]?.clientY;
    if (start !== null && end !== undefined && start - end > 24) openSheet();
  }

  if (count === 0) return null;

  function openSheet() {
    orderAlarm.stop();
    setSilencedFor(count);
    onStop();
  }

  return (
    <button
      type="button"
      key={count}
      onClick={openSheet}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-label={`${count > 1 ? `${count} new orders` : 'New order'} — open`}
      className="press fixed inset-x-0 z-20 bg-success text-white shadow-[0_8px_20px_rgba(0,0,0,0.28)] motion-safe:animate-attention-pulse"
      style={{ bottom: 'calc(4.25rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <span className="app-column safe-x flex min-h-tap items-center justify-center gap-2 py-3 text-base font-extrabold">
        <ChevronUp className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span aria-live="assertive">
          {count > 1 ? `You have ${count} new orders` : 'You have 1 new order'}
        </span>
        {expired ? <span className="font-semibold"> · updating…</span> : null}
        <span className="sr-only">{silenced ? ', alarm silenced' : ''}</span>
      </span>
    </button>
  );
}
