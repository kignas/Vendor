// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  ADVANCE_TARGET,
  billRows,
  commissionPctOf,
  dietOf,
  cutleryOptOut,
  isPlacedOrder,
  isReadyOrder,
  isPreparingOrder,
  isResponseExpired,
  isScheduledOrder,
  isSelfDeliveryOrder,
  itemPriceOf,
  loyaltyLine,
  loyaltySubtitle,
  orderMatchesQuery,
  orderRef,
  ordersForTab,
  paymentModeOf,
  pickupCodeOf,
  prepDeadlineOf,
  prepStartedAtOf,
} from '@/features/orders/orderDomain';
import type { Order } from '@/types/order';

function makeOrder(over: Partial<Order> = {}): Order {
  return { _id: 'o1', status: 'placed', ...over };
}

describe('orderDomain — status mapping', () => {
  it('orderRef prefers publicOrderId, then orderNumber, then id suffix', () => {
    expect(orderRef(makeOrder({ publicOrderId: 'PUB1', orderNumber: 'N1' }))).toBe('PUB1');
    expect(orderRef(makeOrder({ orderNumber: 'N1' }))).toBe('N1');
    expect(orderRef(makeOrder({ _id: 'abcdef123456' }))).toBe('123456');
  });

  it('pickupCodeOf returns empty string when absent', () => {
    expect(pickupCodeOf(makeOrder())).toBe('');
    expect(pickupCodeOf(makeOrder({ pickupCode: 'A9' }))).toBe('A9');
  });

  it('dietOf never infers — only explicit server flags', () => {
    expect(dietOf({ isVeg: true })).toBe('veg');
    expect(dietOf({ foodType: 'non-veg' })).toBe('nonveg');
    expect(dietOf({ name: 'Paneer' })).toBeNull();
    expect(dietOf(null)).toBeNull();
  });

  it('isReadyOrder / isPreparingOrder honour server flags', () => {
    expect(isReadyOrder(makeOrder({ status: 'waiting_for_rider' }))).toBe(true);
    expect(isReadyOrder(makeOrder({ status: 'assigned', isFoodReady: true }))).toBe(true);
    expect(isReadyOrder(makeOrder({ status: 'assigned', isFoodReady: false }))).toBe(false);
    expect(isPreparingOrder(makeOrder({ status: 'preparing' }))).toBe(true);
    expect(isPreparingOrder(makeOrder({ status: 'assigned', isFoodReady: false }))).toBe(true);
  });

  it('ordersForTab splits the queue into the correct tabs', () => {
    const queue: Order[] = [
      makeOrder({ _id: 'a', status: 'placed' }),
      makeOrder({ _id: 'b', status: 'preparing' }),
      makeOrder({ _id: 'c', status: 'waiting_for_rider' }),
      makeOrder({ _id: 'd', status: 'out_for_delivery' }),
    ];
    const now = Date.now();
    expect(ordersForTab('new', queue, [], now).map((o) => o._id)).toEqual(['a']);
    expect(ordersForTab('preparing', queue, [], now).map((o) => o._id)).toEqual(['b']);
    expect(ordersForTab('ready', queue, [], now).map((o) => o._id)).toEqual(['c']);
    expect(ordersForTab('dispatch', queue, [], now).map((o) => o._id)).toEqual(['d']);
  });

  it('scheduled orders sit in the scheduled tab, not new', () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    const order = makeOrder({ _id: 's', status: 'placed', scheduledAt: future });
    const now = Date.now();
    expect(isScheduledOrder(order, now)).toBe(true);
    expect(ordersForTab('new', [order], [], now)).toHaveLength(0);
    expect(ordersForTab('scheduled', [order], [], now)).toHaveLength(1);
  });
});

describe('orderDomain — acceptance window', () => {
  it('uses the server deadline when present', () => {
    const deadline = new Date(Date.now() + 1000).toISOString();
    const order = makeOrder({ restaurantResponseDeadline: deadline, createdAt: new Date(0).toISOString() });
    expect(isResponseExpired(order, Date.now())).toBe(false);
  });

  it('falls back to createdAt + 5 min and reports expiry', () => {
    const order = makeOrder({ createdAt: new Date(Date.now() - 6 * 60_000).toISOString() });
    expect(isResponseExpired(order, Date.now())).toBe(true);
  });

  it('a non-placed order is never "expired"', () => {
    const order = makeOrder({ status: 'confirmed', createdAt: new Date(0).toISOString() });
    expect(isResponseExpired(order, Date.now())).toBe(false);
  });
});

describe('orderDomain — bills and payment are server-sourced only', () => {
  it('returns no rows when the server sends no bill object', () => {
    expect(billRows(makeOrder())).toEqual([]);
  });

  it('reads the nested vendor bill and derives net receivable', () => {
    const order = makeOrder({
      vendorBill: { itemSubtotal: 200, commission: 30, restaurantNetAmount: 170 },
    });
    const rows = billRows(order);
    expect(rows.map((r) => r.label)).toContain('Platform commission');
    expect(rows.find((r) => r.kind === 'total')?.value).toBe(170);
  });

  it('commissionPctOf derives a percentage from server figures', () => {
    const order = makeOrder({ vendorBill: { itemSubtotal: 200, commission: 30 } });
    expect(commissionPctOf(order)).toBe(15);
  });

  it('shows a restaurant promo share only when the server reports one', () => {
    const withPromo = makeOrder({
      vendorBill: { itemSubtotal: 200, restaurantPromoShare: 25, restaurantNetAmount: 175 },
    });
    expect(billRows(withPromo).map((r) => r.label)).toContain('Restaurant promo share');

    // When a discount row already exists, the promo share is not duplicated.
    const withDiscount = makeOrder({
      vendorBill: { itemSubtotal: 200, restaurantDiscount: 25, restaurantNetAmount: 175 },
    });
    expect(billRows(withDiscount).map((r) => r.label)).not.toContain('Restaurant promo share');
  });

  it('paymentModeOf returns null when the server is silent (never guesses)', () => {
    expect(paymentModeOf(makeOrder())).toBeNull();
    expect(paymentModeOf(makeOrder({ paymentMode: 'cod' }))).toBe('cod');
    expect(paymentModeOf(makeOrder({ paymentStatus: 'paid' }))).toBe('upi');
  });
});

describe('orderDomain — search and self-delivery gate', () => {
  it('orderMatchesQuery matches order number, customer and item', () => {
    const order = makeOrder({
      orderNumber: 'ORD-42',
      customerName: 'Asha',
      items: [{ name: 'Masala Dosa' }],
    });
    expect(orderMatchesQuery(order, 'ord-42')).toBe(true);
    expect(orderMatchesQuery(order, 'asha')).toBe(true);
    expect(orderMatchesQuery(order, 'dosa')).toBe(true);
    expect(orderMatchesQuery(order, 'zzz')).toBe(false);
  });

  it('isSelfDeliveryOrder trusts the current restaurant mode over the snapshot', () => {
    const snap = makeOrder({ deliveryModeSnapshot: 'self_delivery' });
    expect(isSelfDeliveryOrder(snap, 'self_delivery')).toBe(true);
    // Current mode wins even if the order snapshot disagrees.
    expect(isSelfDeliveryOrder(snap, 'eatswada_rider')).toBe(false);
    expect(isSelfDeliveryOrder(makeOrder(), undefined)).toBe(false);
  });

  it('ADVANCE_TARGET only maps the two safe transitions', () => {
    expect(ADVANCE_TARGET).toEqual({ confirmed: 'preparing', otp_verified: 'delivered' });
  });

  it('loyaltySubtitle renders the ordinal customer line', () => {
    expect(loyaltySubtitle(makeOrder({ customerName: 'Asha Rao', customerOrderCount: 3 }))).toBe(
      'Asha\u2019s 3rd order',
    );
    expect(loyaltySubtitle(makeOrder({ customerName: 'Asha Rao' }))).toBe('Asha\u2019s order');
  });

  it('prepDeadlineOf reads the persisted server deadline', () => {
    const iso = new Date(Date.now() + 1000).toISOString();
    expect(prepDeadlineOf(makeOrder({ estimatedReadyAt: iso }))).toBe(new Date(iso).getTime());
    expect(prepDeadlineOf(makeOrder())).toBeNull();
  });

  it('prepDeadlineOf falls through an absent leading field (never masked by 0)', () => {
    const iso = new Date(Date.now() + 1000).toISOString();
    // estimatedReadyAt absent, prepReadyAt present: the deadline must still resolve.
    expect(prepDeadlineOf(makeOrder({ prepReadyAt: iso }))).toBe(new Date(iso).getTime());
    expect(prepDeadlineOf(makeOrder({ readyAt: iso }))).toBe(new Date(iso).getTime());
  });

  it('prepStartedAtOf prefers acceptedAt then falls back to createdAt', () => {
    const accepted = new Date(Date.now() - 60_000).toISOString();
    const created = new Date(Date.now() - 120_000).toISOString();
    expect(prepStartedAtOf(makeOrder({ acceptedAt: accepted, createdAt: created }))).toBe(
      new Date(accepted).getTime(),
    );
    expect(prepStartedAtOf(makeOrder({ createdAt: created }))).toBe(new Date(created).getTime());
  });
});

describe('orderDomain — Phase 3 Step 4 helpers', () => {
  it('loyaltyLine shows "Nth order by {name}" only when a count exists', () => {
    expect(
      loyaltyLine(makeOrder({ customerName: 'Asha Rao', customerOrderCount: 1 })),
    ).toBe('1st order by Asha');
    expect(
      loyaltyLine(makeOrder({ customerName: 'Asha Rao', customerOrderCount: 3 })),
    ).toBe('3rd order by Asha');
    // No count at all: nothing is invented for a first-time customer.
    expect(loyaltyLine(makeOrder({ customerName: 'Asha Rao' }))).toBeNull();
    expect(loyaltyLine(makeOrder({ customerName: 'Asha Rao', customerOrderCount: 0 }))).toBeNull();
    expect(loyaltyLine(makeOrder({ customerOrderCount: 2 }))).toBeNull();
  });

  it('cutleryOptOut only fires on an explicit no', () => {
    expect(cutleryOptOut(makeOrder({ sendCutlery: false }))).toBe(true);
    expect(cutleryOptOut(makeOrder({ cutleryRequired: false }))).toBe(true);
    expect(cutleryOptOut(makeOrder({ cutlery: false }))).toBe(true);
    expect(cutleryOptOut(makeOrder({ cutleryPreference: 'No cutlery please' }))).toBe(true);
    expect(cutleryOptOut(makeOrder({ cutleryPreference: "Don't send cutlery" }))).toBe(true);
    // Not an opt-out.
    expect(cutleryOptOut(makeOrder({}))).toBe(false);
    expect(cutleryOptOut(makeOrder({ sendCutlery: true }))).toBe(false);
    expect(cutleryOptOut(makeOrder({ cutleryPreference: 'yes' }))).toBe(false);
  });

  it('itemPriceOf reads a line total first, then unit price × qty', () => {
    expect(itemPriceOf({ name: 'A', itemTotal: 260 })).toBe(260);
    expect(itemPriceOf({ name: 'A', unitPrice: 130, quantity: 2 })).toBe(260);
    expect(itemPriceOf({ name: 'A', price: 130 })).toBe(130);
    expect(itemPriceOf({ name: 'A', price: 130, qty: 3 })).toBe(390);
    // No price at all: null, never a fabricated 0.
    expect(itemPriceOf({ name: 'A' })).toBeNull();
  });

  it('isPlacedOrder is true only for the placed status', () => {
    expect(isPlacedOrder(makeOrder({ status: 'placed' }))).toBe(true);
    expect(isPlacedOrder(makeOrder({ status: 'confirmed' }))).toBe(false);
  });
});
