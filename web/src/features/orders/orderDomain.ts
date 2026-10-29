/**
 * Pure order-domain helpers — a faithful port of the legacy dashboard's
 * mapping/derivation functions (index.html §1c). No React, no DOM, no fetch:
 * everything here is deterministic and unit-testable.
 *
 * Rules preserved from AGENTS.md / PORTING_MAP:
 *   - status strings are rendered raw and never remapped
 *   - a field is only presented when the server supplies it; otherwise the UI
 *     shows nothing rather than a guessed value
 */
import { firstNumber, num } from '@/lib/format';
import type { Order, OrderItem, OrderTab } from '@/types/order';
import { ORDER_STATUS } from '@/types/order';

export type Diet = 'veg' | 'nonveg' | null;

/** Mirrors legacy `dietOf()` — never infers; only reads explicit server flags. */
export function dietOf(item: OrderItem | null | undefined): Diet {
  if (!item) return null;
  if (item.isVeg === true || item.veg === true) return 'veg';
  if (item.isVeg === false || item.veg === false) return 'nonveg';
  const t = String(item.foodType || item.dietaryType || item.dietType || '').toLowerCase();
  if (t === 'veg' || t === 'vegetarian') return 'veg';
  if (t === 'nonveg' || t === 'non-veg' || t === 'non_veg' || t === 'nonvegetarian') return 'nonveg';
  return null;
}

/** Mirrors legacy `orderRef()`. */
export function orderRef(order: Order): string {
  return (
    order.publicOrderId ||
    order.orderNumber ||
    String(order._id || '')
      .slice(-6)
      .toUpperCase()
  );
}

/** Mirrors legacy `pickupCodeOf()`. Empty string when absent. */
export function pickupCodeOf(order: Order): string {
  const raw = order.pickupCode ?? order.pickupOtp ?? order.deliveryOtp;
  return raw === undefined || raw === null || raw === '' ? '' : String(raw);
}

/** A positive timestamp or null (0 is never a meaningful deadline). */
function positiveOrNull(value: number | null): number | null {
  return value !== null && value > 0 ? value : null;
}

/** Mirrors legacy `prepDeadlineOf()` — reads persisted server deadlines only. */
export function prepDeadlineOf(order: Order): number | null {
  return positiveOrNull(
    firstNumber(
      order.estimatedReadyAt ? new Date(order.estimatedReadyAt).getTime() : null,
      order.prepReadyAt ? new Date(order.prepReadyAt).getTime() : null,
      order.readyAt ? new Date(order.readyAt).getTime() : null,
    ),
  );
}

/** Mirrors legacy `scheduledAtOf()`. */
export function scheduledAtOf(order: Order): number | null {
  return positiveOrNull(
    firstNumber(
      order.scheduledAt ? new Date(order.scheduledAt).getTime() : null,
      order.scheduledFor ? new Date(order.scheduledFor).getTime() : null,
      order.deliverySlotAt ? new Date(order.deliverySlotAt).getTime() : null,
      order.deliverySlot && order.deliverySlot.startAt
        ? new Date(order.deliverySlot.startAt).getTime()
        : null,
    ),
  );
}

/** Mirrors legacy `isScheduledOrder()` — future slot + not yet cooking. */
export function isScheduledOrder(order: Order, now = Date.now()): boolean {
  if (order.status !== ORDER_STATUS.placed && order.status !== ORDER_STATUS.confirmed) return false;
  const at = scheduledAtOf(order);
  return at !== null && at > now;
}

/** Mirrors legacy `isReadyOrder()` — server flags win. */
export function isReadyOrder(o: Order): boolean {
  if (o.status === ORDER_STATUS.outForDelivery || o.status === ORDER_STATUS.placed) return false;
  if (
    o.isFoodReady === true ||
    o.status === 'ready_for_pickup' ||
    o.status === ORDER_STATUS.waitingForRider
  ) {
    return true;
  }
  return o.status === ORDER_STATUS.assigned && o.isFoodReady !== false;
}

/** Mirrors legacy `isPreparingOrder()`. */
export function isPreparingOrder(o: Order, now = Date.now()): boolean {
  if (isReadyOrder(o)) return false;
  if (isScheduledOrder(o, now)) return false;
  return (
    o.status === ORDER_STATUS.confirmed ||
    o.status === ORDER_STATUS.preparing ||
    (o.status === ORDER_STATUS.assigned && o.isFoodReady === false)
  );
}

/** Mirrors legacy `ordersForTab()`. */
export function ordersForTab(
  tab: OrderTab,
  queue: Order[],
  history: Order[],
  now = Date.now(),
): Order[] {
  switch (tab) {
    case 'new':
      return queue.filter((o) => o.status === ORDER_STATUS.placed && !isScheduledOrder(o, now));
    case 'preparing':
      return queue.filter((o) => isPreparingOrder(o, now));
    case 'ready':
      return queue.filter(isReadyOrder);
    case 'dispatch':
      return queue.filter((o) => o.status === ORDER_STATUS.outForDelivery);
    case 'scheduled':
      return queue.filter((o) => isScheduledOrder(o, now));
    case 'history':
      return history;
    default:
      return [];
  }
}

/** Mirrors legacy `orderMatchesQuery()` — client-side search over loaded rows. */
export function orderMatchesQuery(order: Order, q: string): boolean {
  if (!q) return true;
  const hay = [
    order.publicOrderId,
    order.orderNumber,
    order._id,
    order.publicShipmentId,
    order.shipmentId,
    order.customerName,
    order.user && order.user.name,
    order.customerPhone,
    Array.isArray(order.items) ? order.items.map((i) => i && i.name).join(' ') : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.indexOf(q) !== -1;
}

/** Mirrors legacy `orderBillOf()` — finds the authoritative bill object. */
export function orderBillOf(order: Order): Record<string, unknown> | null {
  const isObj = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === 'object' && !Array.isArray(v);
  const candidates = [
    order.vendorBill,
    order.settlement,
    order.billBreakdown,
    order.bill,
    order.pricing,
    isObj(order.netVendorPayout) ? order.netVendorPayout : undefined,
  ];
  const nested = candidates.find(isObj);
  if (nested) return nested;

  const flat: Record<string, unknown> = {};
  for (const k of ['itemSubtotal', 'commissionAmount', 'netReceivable', 'restaurantNetAmount']) {
    if (order[k] !== undefined && order[k] !== null) flat[k] = order[k];
  }
  if (typeof order.netVendorPayout === 'number' && flat.netReceivable === undefined) {
    flat.netReceivable = order.netVendorPayout;
  }
  if (flat.commissionAmount !== undefined) flat.commission = flat.commissionAmount;
  return Object.keys(flat).length ? flat : null;
}

export interface BillRow {
  label: string;
  value: number;
  kind: '' | 'neg' | 'total';
}

/** Mirrors legacy `billRows()`. */
export function billRows(order: Order): BillRow[] {
  const b = orderBillOf(order);
  if (!b) return [];
  const rows: BillRow[] = [];
  const push = (label: string, value: number | null, kind: BillRow['kind'] = '') => {
    if (value !== null) rows.push({ label, value, kind });
  };
  push('Item subtotal', firstNumber(b.itemSubtotal, b.subtotal, b.itemsTotal, b.foodSubtotal));
  push('Packaging charge', firstNumber(b.packagingCharge, b.packagingFee, b.packaging));
  const disc = firstNumber(b.restaurantDiscount, b.vendorDiscount, b.discount);
  if (disc !== null) {
    const funder = String(b.discountFundedBy ?? b.discountFunder ?? '').toLowerCase();
    const label =
      funder === 'restaurant' || funder === 'vendor'
        ? 'Discount (restaurant-funded)'
        : 'Discount';
    push(label, disc, 'neg');
  }
  push('Taxes', firstNumber(b.taxes, b.tax, b.gst));
  push('Platform commission', firstNumber(b.platformCommission, b.commission, b.vendorCommission), 'neg');
  push('Other adjustments', firstNumber(b.adjustment, b.adjustments, b.penalty), 'neg');
  push(
    'Your net receivable',
    firstNumber(b.vendorNet, b.restaurantNetAmount, b.netAmount, b.netReceivable),
    'total',
  );
  return rows;
}

/** Mirrors legacy `paymentModeOf()`. Returns null when the server is silent. */
export function paymentModeOf(order: Order): 'cod' | 'upi' | null {
  const raw = String(
    order.paymentMode ||
      order.paymentMethod ||
      order.paymentType ||
      (order.payment && (order.payment.mode || order.payment.method)) ||
      '',
  ).toLowerCase();
  if (/cod|cash/.test(raw)) return 'cod';
  if (/upi|online|prepaid|card|netbanking|paid/.test(raw)) return 'upi';
  const ps = String(order.paymentStatus || '').toLowerCase();
  if (order.isPaid === true || order.paid === true || ps === 'paid') return 'upi';
  if (order.isPaid === false || order.paid === false || ps === 'pending') return 'cod';
  return null;
}

/** Mirrors legacy `commissionPctOf()`. Only derived from server figures. */
export function commissionPctOf(order: Order): number | null {
  const b = orderBillOf(order) ?? {};
  const direct = firstNumber(b.commissionRate, b.commissionPercent, b.commissionPct, order.commissionRate);
  if (direct !== null) return direct;
  const sub = firstNumber(b.itemSubtotal, b.subtotal, b.itemsTotal, b.foodSubtotal);
  const comm = firstNumber(b.platformCommission, b.commission, b.vendorCommission);
  if (sub && comm !== null && sub > 0) return Math.round((comm / sub) * 1000) / 10;
  return null;
}

/** Mirrors legacy `orderTotalOf()` equivalent — the order bill total. */
export function orderTotalOf(order: Order): number | null {
  return firstNumber(order.total, order.grandTotal, order.amount);
}

/** Mirrors legacy `riderStatusOf()`. */
export function riderStatusOf(order: Order): string {
  return String(order.riderStatus || order.deliveryRiderStatus || order.riderState || '').toLowerCase();
}

/** Mirrors legacy `riderNameOf()`. */
export function riderNameOf(order: Order): string {
  const r = order.rider || order.deliveryPartner || {};
  return order.riderName || r.name || r.fullName || 'Rider';
}

/** Mirrors legacy `riderPhoneOf()`. */
export function riderPhoneOf(order: Order): string {
  const r = order.rider || order.deliveryPartner || {};
  return order.riderPhone || r.phone || r.mobile || '';
}

/** Mirrors legacy `loyaltySubtitle()`. */
export function loyaltySubtitle(order: Order): string {
  const count = firstNumber(
    order.customerOrderCount,
    order.userOrderCount,
    order.customer && order.customer.orderCount,
    order.orderCountWithRestaurant,
  );
  const name = order.customerName || (order.user && order.user.name) || 'Customer';
  const first = String(name).trim().split(/\s+/)[0] || 'Customer';
  if (count !== null && count > 0) return `${first}\u2019s ${ordinal(count)} order`;
  return `${first}\u2019s order`;
}

/** Mirrors legacy `ordinal()`. */
export function ordinal(n: number): string {
  const k = n % 100;
  if (k >= 11 && k <= 13) return `${n}th`;
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
}

/** Mirrors legacy `ticketStamp()` — en-IN short date-time, or empty. */
export function ticketStamp(order: Order): string {
  const when = order.createdAt ? new Date(order.createdAt) : null;
  if (!when || Number.isNaN(when.getTime())) return '';
  return when.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Mirrors legacy `orderCountChipHtml()` data — the count, or null. */
export function orderCountWithRestaurant(order: Order): number | null {
  return firstNumber(
    order.customerOrderCount,
    order.userOrderCount,
    order.customer && order.customer.orderCount,
    order.orderCountWithRestaurant,
  );
}

/**
 * The "Respond within 5:00" acceptance window. Mirrors renderTicket(): the
 * server deadline if present, else created + 5 min.
 */
export function responseDeadlineOf(order: Order): number {
  if (order.restaurantResponseDeadline) {
    return new Date(order.restaurantResponseDeadline).getTime();
  }
  return order.createdAt ? new Date(order.createdAt).getTime() + 5 * 60 * 1000 : 0;
}

/** Whether a `placed` order's acceptance window has closed. */
export function isResponseExpired(order: Order, now = Date.now()): boolean {
  if (order.status !== ORDER_STATUS.placed) return false;
  const deadline = responseDeadlineOf(order);
  return deadline > 0 && now >= deadline;
}

/**
 * ADVANCE_TARGET from the legacy dashboard. The vendor route derives the next
 * status itself; we only ever offer the confirmed→preparing and
 * otp_verified→delivered moves.
 */
export const ADVANCE_TARGET: Record<string, string> = {
  [ORDER_STATUS.confirmed]: ORDER_STATUS.preparing,
  [ORDER_STATUS.otpVerified]: ORDER_STATUS.delivered,
};

/** Mirrors legacy `isSelfDeliveryOrder()` gate. */
export function isSelfDeliveryOrder(
  order: Order | null | undefined,
  restaurantDeliveryMode: string | undefined,
): boolean {
  if (restaurantDeliveryMode === 'self_delivery') return true;
  if (restaurantDeliveryMode === 'eatswada_rider') return false;
  if (!order) return false;
  return order.deliveryModeSnapshot === 'self_delivery';
}

export { num };
