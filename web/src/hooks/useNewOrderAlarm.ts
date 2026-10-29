import { useEffect, useRef } from 'react';
import { orderAlarm } from '@/services/notifications/alarm';
import { isScheduledOrder } from '@/features/orders/orderDomain';
import type { Order } from '@/types/order';

/**
 * Drives the new-order alarm from the live queue.
 *
 * Rules preserved from the legacy `updateCounts()`:
 *   - the alarm starts when the number of NEW (placed, unscheduled) orders
 *     rises above the previous count
 *   - when new orders return to zero the alarm stops
 *   - the first load primes the counter without firing (so opening the app does
 *     not blast the alarm for orders that were already waiting)
 *
 * A single order is never counted twice: the count comes from the queue itself,
 * so a duplicate poll with the same orders does not re-trigger.
 */
export function useNewOrderAlarm(orders: Order[] | undefined): number {
  const count = (orders ?? []).filter((o) => o.status === 'placed' && !isScheduledOrder(o)).length;
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    if (orders === undefined) return; // still loading
    const prev = prevRef.current;
    if (prev === null) {
      // First successful load: prime without alarming.
      prevRef.current = count;
      if (count === 0) orderAlarm.stop();
      return;
    }
    if (count > prev) orderAlarm.start(count);
    else if (count === 0) orderAlarm.stop();
    prevRef.current = count;
  }, [count, orders]);

  return count;
}
