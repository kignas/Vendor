import { describe, expect, it, beforeEach } from 'vitest';
import {
  DISMISSED_CARDS_KEY,
  buildInfoCards,
  dismissCard,
  isCardDismissed,
  readDismissedCards,
  visibleInfoCards,
} from '@/features/orders/infoCards';

const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  window.localStorage.clear();
});

describe('buildInfoCards', () => {
  it('builds alert cards from the server alert types only', () => {
    const cards = buildInfoCards({
      alerts: [
        { type: 'out_of_stock', entityId: 'a' },
        { type: 'out_of_stock', entityId: 'b' },
        { type: 'low_stock', entityId: 'c' },
        { type: 'menu_pending', entityId: 'd' },
        { type: 'menu_rejected', entityId: 'e' },
        { type: 'order_action', entityId: 'f' },
      ],
    });
    expect(cards.map((c) => c.id)).toEqual([
      'alert:out_of_stock',
      'alert:low_stock',
      'alert:menu_pending',
      'alert:menu_rejected',
    ]);
    expect(cards[0].title).toBe('2 items out of stock');
    expect(cards[1].title).toBe('1 item running low');
    // order_action is not a carousel card — it is the new-order bar's job.
    expect(cards.some((c) => c.id.includes('order_action'))).toBe(false);
  });

  it('builds a settlement card only when a balance is actually withdrawable', () => {
    expect(buildInfoCards({ settlement: { availableForWithdrawal: 0 } })).toEqual([]);
    expect(buildInfoCards({ settlement: {} })).toEqual([]);

    const cards = buildInfoCards({ settlement: { availableForWithdrawal: 1250 } });
    expect(cards.map((c) => c.id)).toEqual(['settlement:available']);
    expect(cards[0].title).toContain('available to withdraw');
    expect(cards[0].to).toBe('/business?seg=finance');
  });

  it('adds a pending-withdrawal card only when the backend reports a request', () => {
    const cards = buildInfoCards({
      settlement: { activePayoutRequest: { amount: 500, status: 'pending' } },
    });
    expect(cards.map((c) => c.id)).toEqual(['settlement:pending']);
    expect(cards[0].title).toContain('in progress');
  });

  it('adds a profile card only for an explicit non-verified FSSAI state', () => {
    expect(buildInfoCards({ profile: {} })).toEqual([]);
    expect(buildInfoCards({ profile: { fssaiVerificationStatus: 'verified' } })).toEqual([]);

    const cards = buildInfoCards({ profile: { fssaiVerificationStatus: 'pending' } });
    expect(cards.map((c) => c.id)).toEqual(['profile:fssai']);
    expect(cards[0].to).toBe('/profile');
  });

  it('returns no cards for empty input', () => {
    expect(buildInfoCards({})).toEqual([]);
    expect(buildInfoCards({ alerts: [], settlement: null, profile: null })).toEqual([]);
  });
});

describe('dismissal persistence', () => {
  it('persists a dismissal under the new key and leaves auth keys untouched', () => {
    window.localStorage.setItem('nearbite_vendor_token', 't');
    dismissCard('alert:low_stock', Date.now());

    const raw = window.localStorage.getItem(DISMISSED_CARDS_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(String(raw));
    expect(Object.keys(parsed)).toEqual(['alert:low_stock']);

    expect(window.localStorage.getItem('nearbite_vendor_token')).toBe('t');
    expect(window.localStorage.getItem('nearbite_vendor_user')).toBeNull();
  });

  it('tolerates a corrupt dismissal payload', () => {
    window.localStorage.setItem(DISMISSED_CARDS_KEY, 'not-json{');
    expect(readDismissedCards()).toEqual({});
    expect(isCardDismissed('x', readDismissedCards())).toBe(false);
  });

  it('hides a card dismissed today and shows it again the next day', () => {
    const now = Date.now();
    const map = dismissCard('alert:low_stock', now);

    expect(isCardDismissed('alert:low_stock', map, now)).toBe(true);
    expect(isCardDismissed('alert:low_stock', map, now + DAY)).toBe(false);
  });

  it('reappears the next day only while its underlying alert still exists', () => {
    const now = Date.now();
    const map = dismissCard('alert:out_of_stock', now);

    // Alert still present the next day → the card is rebuilt and visible again.
    const stillThere = buildInfoCards({ alerts: [{ type: 'out_of_stock' }] });
    expect(visibleInfoCards(stillThere, map, now + DAY)).toHaveLength(1);

    // Alert gone → nothing is built, so there is nothing to reappear.
    const gone = buildInfoCards({ alerts: [] });
    expect(visibleInfoCards(gone, map, now + DAY)).toHaveLength(0);
  });

  it('filters out cards dismissed on the current day', () => {
    const now = Date.now();
    const cards = buildInfoCards({
      alerts: [{ type: 'low_stock' }, { type: 'out_of_stock' }],
    });
    const map = dismissCard('alert:low_stock', now);
    expect(visibleInfoCards(cards, map, now).map((c) => c.id)).toEqual(['alert:out_of_stock']);
  });
});
