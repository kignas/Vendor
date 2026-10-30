import { describe, expect, it } from 'vitest';
import { ordersEmptyCopy } from '@/features/orders/ordersEmptyState';

describe('ordersEmptyCopy', () => {
  it('accepting (open) shows the online copy with no action', () => {
    const copy = ordersEmptyCopy('open', null);
    expect(copy.title).toBe('You are online');
    expect(copy.body).toBe('Waiting for new orders');
    expect(copy.variant).toBe('open');
    expect(copy.action).toBeNull();
  });

  it('closed_today is offline with a Turn on Online action', () => {
    const copy = ordersEmptyCopy('closed_today', null);
    expect(copy.title).toBe('You are offline');
    expect(copy.body).toBe('Turn on Online to receive orders');
    expect(copy.variant).toBe('closed');
    expect(copy.action).toBe('online');
  });

  it('temporarily_closed is paused with a Resume action and neutral body when no reason', () => {
    const copy = ordersEmptyCopy('temporarily_closed', null);
    expect(copy.title).toBe('Orders are paused');
    expect(copy.body).toBe('New orders are on hold until you resume.');
    expect(copy.variant).toBe('paused');
    expect(copy.action).toBe('resume');
  });

  it('shows the server pause reason verbatim when one is supplied', () => {
    const copy = ordersEmptyCopy('temporarily_closed', 'Kitchen maintenance until 6pm');
    expect(copy.body).toBe('Kitchen maintenance until 6pm');
    // The title stays ours; only the body reflects the server text.
    expect(copy.title).toBe('Orders are paused');
  });

  it('busy is STILL accepting: it never claims "paused" and offers no action', () => {
    const copy = ordersEmptyCopy('busy', null);
    expect(copy.title).not.toMatch(/paused/i);
    expect(copy.title).toBe('You are busy');
    expect(copy.action).toBeNull();
  });

  it('unknown status (null) is neutral with no status claim and no action', () => {
    const copy = ordersEmptyCopy(null, null);
    expect(copy.variant).toBe('neutral');
    expect(copy.title).toBe('No orders right now');
    expect(copy.action).toBeNull();
  });

  it('open uses per-tab copy for the Ready and Picked up lists', () => {
    expect(ordersEmptyCopy('open', null, 'ready').title).toBe('Nothing ready yet');
    expect(ordersEmptyCopy('open', null, 'dispatch').title).toBe('No orders picked up yet');
  });

  it('an unknown availability string falls back to neutral (never guesses a state)', () => {
    const copy = ordersEmptyCopy('something_else' as never, null);
    expect(copy.variant).toBe('neutral');
    expect(copy.action).toBeNull();
  });
});
