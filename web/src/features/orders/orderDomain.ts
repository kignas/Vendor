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

/**
 * First valid epoch from the candidates. Unlike `firstNumber` this skips absent
 * (`null`/`undefined`/`''`) values instead of coercing them to `0`, so a missing
 * leading field cannot mask a real deadline further down the chain.
 */
function firstTimestamp(...values: (string | null | undefined)[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const ms = new Date(value).getTime();
    if (Number.isFinite(ms) && ms > 0) return ms;
  }
  return null;
}

/** Mirrors legacy `prepDeadlineOf()` — reads persisted server deadlines only. */
export function prepDeadlineOf(order: Order): number | null {
  return positiveOrNull(
    firstTimestamp(order.estimatedReadyAt, order.prepReadyAt, order.readyAt),
  );
}

/**
 * Prep start reference. Mirrors the legacy `firstNumber(acceptedAt, updatedAt,
 * createdAt)` chain used by both prepStripHtml and kptPct.
 */
export function prepStartedAtOf(order: Order): number | null {
  return positiveOrNull(firstTimestamp(order.acceptedAt, order.updatedAt, order.createdAt));
}

/** Mirrors legacy `scheduledAtOf()`. */
export function scheduledAtOf(order: Order): number | null {
  return positiveOrNull(
    firstTimestamp(
      order.scheduledAt,
      order.scheduledFor,
      order.deliverySlotAt,
      order.deliverySlot?.startAt ?? null,
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
  // Mirrors legacy billDetailsHtml: the restaurant promo share is shown only
  // when the server reports it and it is not already represented by the
  // discount row.
  const promo = firstNumber(
    b.restaurantPromoShare,
    b.promoShare,
    b.restaurantDiscount,
    b.vendorDiscount,
  );
  if (promo !== null && !rows.some((r) => /discount/i.test(r.label))) {
    push('Restaurant promo share', promo, 'neg');
  }
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
  const direct = firstNumber(order.total, order.grandTotal, order.amount);
  if (direct !== null) return direct;
  // Mirrors legacy `billDetailsHtml`: when the server omits a top-level total,
  // the displayed total falls back to the net receivable from the bill.
  const net = billRows(order).find((r) => r.kind === 'total');
  return net ? net.value : null;
}

/** Mirrors legacy `riderStatusOf()`. */
export function riderStatusOf(order: Order): string {
  return String(order.riderStatus || order.deliveryRiderStatus || order.riderState || '').toLowerCase();
}

/** Mirrors legacy `riderNameOf()`. */
export function riderNameOf(order: Order): string {
  const r = order.rider || order.deliveryPartner || order.deliveryBoy || {};
  return order.riderName || r.name || r.fullName || order.deliveryPartnerName || 'Rider';
}

/** Mirrors legacy `riderPhoneOf()`. */
export function riderPhoneOf(order: Order): string {
  const r = order.rider || order.deliveryPartner || order.deliveryBoy || {};
  return order.riderPhone || r.phone || r.mobile || order.deliveryPartnerPhone || '';
}

/** Timestamp the rider reached the counter, if the server sent one. */
export function riderReachedAtOf(order: Order): number | null {
  return positiveOrNull(
    firstTimestamp(order.reachedRestaurantAt, order.riderReachedAt, order.riderArrivedAt),
  );
}

/** Scheduled rider dispatch time, if the server sent one. */
export function riderDispatchAtOf(order: Order): number | null {
  return positiveOrNull(
    firstTimestamp(order.scheduledDispatchAt, order.dispatchScheduledAt, order.riderDispatchAt),
  );
}

/**
 * Whether the server actually sent any rider data (Phase 3, Step 5). The card
 * shows the bordered rider box only when this is true — a plain status copy
 * such as "Waiting for rider assignment" is NOT rider data, and counts like
 * "5 riders nearby" are never invented.
 */
export function hasRiderData(order: Order): boolean {
  if (riderStatusOf(order) !== '') return true;
  if (riderPhoneOf(order) !== '') return true;
  const r = order.rider || order.deliveryPartner || order.deliveryBoy || {};
  if (order.riderName || order.deliveryPartnerName || r.name || r.fullName) return true;
  if (riderReachedAtOf(order) !== null || riderDispatchAtOf(order) !== null) return true;
  if (order.riderArrived || order.riderAtRestaurant || order.riderReached) return true;
  if (
    firstNumber(order.riderEtaMinutes, order.etaMinutes, order.riderEta, order.arrivingInMinutes) !== null
  ) {
    return true;
  }
  return false;
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

/**
 * The "1st order by Asha" line for the accept sheet (Phase 3, Step 4). Unlike
 * `loyaltySubtitle`, it returns null when the server sent NO customer-order
 * count at all, so the line is shown only when the data really exists rather
 * than falling back to a bare "{name}'s order" for a first-time customer.
 */
export function loyaltyLine(order: Order): string | null {
  const count = orderCountWithRestaurant(order);
  if (count === null || count <= 0) return null;
  const name = order.customerName || (order.user && order.user.name) || '';
  const first = String(name).trim().split(/\s+/)[0];
  if (!first) return null;
  return `${ordinal(count)} order by ${first}`;
}

/** Mirrors legacy `isPlacedOrder()`. */
export function isPlacedOrder(order: Order): boolean {
  return order.status === ORDER_STATUS.placed;
}

/**
 * Whether the order clearly asks for NO cutlery. Reads the same aliases the
 * legacy cutlery strip does (`sendCutlery`/`cutlery`/`cutleryPreference`/
 * `cutleryRequired`). The semantics of `cutlery`/`cutleryPreference` are not
 * pinned down by VENDOR-API-CONTRACT.md, so a boolean `false` — or a
 * preference string that explicitly says no / skip / don't send — is treated as
 * an opt-out; anything else (including a "yes" preference) is not. The accept
 * sheet therefore shows its red "Don't send cutlery…" tag only on an explicit
 * opt-out. See docs/rebuild/OPEN_QUESTIONS.md (Q18).
 */
export function cutleryOptOut(order: Order): boolean {
  if (order.sendCutlery === false || order.cutleryRequired === false) return true;
  if (order.cutlery === false) return true;
  const pref = String(order.cutleryPreference ?? '').trim().toLowerCase();
  if (pref && /(no|skip|not|none|without|don'?t|dont|never)/.test(pref)) return true;
  return false;
}

/**
 * Per-item price. Reads only fields the order item may carry; the backend order
 * item shape is not pinned down by VENDOR-API-CONTRACT.md (it names menu-item
 * `price`, not the order-item field), so this returns null — and the UI shows
 * nothing — when the server sent no usable figure (AGENTS.md rules 2 & 5).
 */
export function itemPriceOf(item: OrderItem): number | null {
  const line = firstNumber(item.itemTotal, item.totalPrice, item.lineTotal, item.totalAmount);
  if (line !== null) return line;
  const unit = firstNumber(item.unitPrice, item.price, item.itemPrice, item.rate, item.amount);
  if (unit === null) return null;
  const qty = firstNumber(item.quantity, item.qty) ?? 1;
  return unit * qty;
}

/**
 * Per-item customisation detail for the item sheet (Phase 3, Step 5). Reads the
 * same aliases the legacy `itemMetaHtml` did — variant, add-ons/options/
 * customisations, and the item note. Returns null when the item carries none of
 * them, so the card only offers the detail sheet when there is real data.
 */
export interface ItemDetail {
  variant: string | null;
  addons: string[];
  note: string | null;
}

export function itemDetailOf(item: OrderItem | null | undefined): ItemDetail | null {
  if (!item) return null;
  const variantRaw = item.variant || item.size || item.variantName || item.portion;
  const variant = typeof variantRaw === 'string' && variantRaw.trim() ? variantRaw.trim() : null;

  const raw = item.addons ?? item.options ?? item.customizations ?? item.customisation;
  const addons: string[] = [];
  if (Array.isArray(raw)) {
    for (const a of raw) {
      const name =
        a && typeof a === 'object'
          ? (a as { name?: unknown; label?: unknown; title?: unknown }).name ??
            (a as { label?: unknown }).label ??
            (a as { title?: unknown }).title
          : a;
      if (typeof name === 'string' && name.trim()) addons.push(name.trim());
    }
  } else if (typeof raw === 'string' && raw.trim()) {
    addons.push(raw.trim());
  }

  const noteRaw = item.note || item.instructions;
  const note = typeof noteRaw === 'string' && noteRaw.trim() ? noteRaw.trim() : null;

  if (!variant && !addons.length && !note) return null;
  return { variant, addons, note };
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
