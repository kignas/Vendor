import { useNow } from '@/hooks/useNow';
import { responseDeadlineOf } from '@/features/orders/orderDomain';
import { ORDER_STATUS, type Order } from '@/types/order';

export interface AcceptanceWindow {
  /** Server deadline (epoch ms) or 0 when the order has none. */
  deadline: number;
  /** ms remaining, floored at 0. */
  remaining: number;
  /** True once the window has closed. */
  expired: boolean;
  /** True while a live countdown is meaningful (placed order with a deadline). */
  active: boolean;
}

/**
 * The order acceptance window. The deadline is a persisted server timestamp
 * (`restaurantResponseDeadline`) with the legacy created+5min fallback; the
 * countdown is only ever derived from it, never restarted locally. A `placed`
 * order with no deadline at all has no countdown — the buttons stay enabled and
 * the server remains the authority on whether the accept still succeeds.
 */
export function useAcceptanceWindow(order: Order): AcceptanceWindow {
  const isPlaced = order.status === ORDER_STATUS.placed;
  const deadline = isPlaced ? responseDeadlineOf(order) : 0;
  const active = isPlaced && deadline > 0;
  const now = useNow(1000, active);
  const remaining = active ? Math.max(0, deadline - now) : 0;
  return { deadline, remaining, expired: active && remaining <= 0, active };
}

/** `mm:ss` for the countdown. */
export function formatCountdown(remaining: number): string {
  const total = Math.max(0, Math.ceil(remaining / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
