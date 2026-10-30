import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryClient';
import {
  acceptOrder,
  advanceOrderStatus,
  extendPrep,
  markOrderReady,
  rejectOrder,
  undoOrderReady,
  verifyDeliveryOtp,
} from '@/services/api/orders';
import { ADVANCE_TARGET } from '@/features/orders/orderDomain';
import { orderAlarm } from '@/services/notifications/alarm';
import type { Order } from '@/types/order';

/**
 * Order mutations. Every mutation is single-flight per order id: a double tap
 * cannot fire two requests (AGENTS.md rule 7). After any success the queue is
 * invalidated so the server state is authoritative.
 */
export function useOrderActions() {
  const queryClient = useQueryClient();
  const busyRef = useRef<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders('queue') });
  }, [queryClient]);

  /**
   * Whether the queue currently says the order is still `placed`. Reads the
   * cache fresh (not a render closure) so it reflects the authoritative refetch
   * after a failed accept — a stale answer would mislabel a real error.
   */
  const isStillPlaced = useCallback(
    (id: string) => {
      const rows = queryClient.getQueryData<Order[]>(queryKeys.orders('queue'));
      return Array.isArray(rows) && rows.some((o) => o._id === id && o.status === 'placed');
    },
    [queryClient],
  );

  const run = useCallback(
    async (
      id: string,
      task: () => Promise<unknown>,
      successMsg: string,
      options?: {
        /** When set, a failure re-checks the order and may show `goneMessage`. */
        goneMessage?: string | undefined;
      },
    ): Promise<boolean> => {
      if (busyRef.current.has(id)) return false;
      busyRef.current.add(id);
      setBusyIds(new Set(busyRef.current));
      try {
        await task();
        orderAlarm.tap();
        orderAlarm.stop();
        toast.success(successMsg);
        refresh();
        return true;
      } catch (err) {
        if (options?.goneMessage) {
          // Refetch first, then read the cache fresh: the order left `placed`
          // while we were sending (accepted elsewhere) only if the authoritative
          // queue now says so. Otherwise this is a real error and we show it.
          await queryClient.refetchQueries({ queryKey: queryKeys.orders('queue') });
          if (!isStillPlaced(id)) {
            // The dark pill styling lives in the Toaster (index.css `.es-toast`),
            // so no inline colour is needed here.
            toast(options.goneMessage);
            return false;
          }
        }
        toast.error(err instanceof Error ? err.message : 'Action failed. Please try again.');
        return false;
      } finally {
        busyRef.current.delete(id);
        setBusyIds(new Set(busyRef.current));
      }
    },
    [refresh, isStillPlaced, queryClient],
  );

  return {
    busyIds,
    accept: (id: string, prepMinutes: number) =>
      run(id, () => acceptOrder(id, prepMinutes), `Order accepted · ${prepMinutes} min`, {
        goneMessage: 'Order already accepted',
      }),
    reject: (id: string, reason: string) => run(id, () => rejectOrder(id, reason), 'Order rejected'),
    advance: (order: Order) => {
      const next = ADVANCE_TARGET[order.status];
      if (!next) {
        toast.error('This order cannot be advanced from its current status.');
        return;
      }
      return run(
        order._id,
        () => advanceOrderStatus(order._id, next),
        next === 'delivered' ? 'Order marked delivered' : 'Order updated',
      );
    },
    markReady: (id: string) => run(id, () => markOrderReady(id), 'Order marked ready'),
    undoReady: (id: string) => run(id, () => undoOrderReady(id), 'Ready undone'),
    extendPrep: (id: string) => run(id, () => extendPrep(id), 'Prep time extended by 5 min'),
    verifyOtp: (id: string, otp: string) =>
      run(id, () => verifyDeliveryOtp(id, otp), 'PIN verified. Mark the order delivered.'),
  };
}
