import { useEffect, useRef } from 'react';
import { BellRing } from 'lucide-react';
import { useNow } from '@/hooks/useNow';
import { responseDeadlineOf } from '@/features/orders/orderDomain';
import { ORDER_STATUS, type Order } from '@/types/order';

/**
 * Prominent new-order banner. Mirrors the legacy `#alarmBar`: it appears while
 * new (placed, unscheduled) orders are waiting, names how many, offers a Stop
 * control that silences the alarm, and disappears once nothing is waiting.
 * The chime/vibration itself is owned by `orderAlarm`; this only renders it and
 * asks the page to refresh the moment an acceptance window lapses.
 */
export function NewOrderBanner({
  orders,
  onStop,
  onExpired,
}: {
  orders: Order[];
  onStop: () => void;
  onExpired?: () => void;
}) {
  const waiting = orders.filter((o) => o.status === ORDER_STATUS.placed);
  const count = waiting.length;

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
      role="alert"
      aria-live="assertive"
      className="-mx-4 mb-1 flex items-center gap-3 rounded-card bg-warning px-4 py-3 text-white shadow-md motion-safe:animate-pulse"
    >
      <BellRing className="h-5 w-5 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm font-extrabold">
        {count > 1 ? `${count} new orders waiting` : 'New order waiting'}
        {expired ? <span className="font-semibold"> · updating…</span> : null}
      </p>
      <button
        type="button"
        onClick={onStop}
        className="min-h-tap shrink-0 rounded-pill bg-white px-3.5 text-[13px] font-extrabold text-warning"
      >
        Stop
      </button>
    </div>
  );
}
