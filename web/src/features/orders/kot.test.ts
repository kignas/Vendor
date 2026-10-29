import { describe, expect, it } from 'vitest';
import { buildKotHtml } from '@/features/orders/kot';
import { buildOrderSpeech, speechAvailable } from '@/features/orders/voice';
import type { Order } from '@/types/order';

function makeOrder(over: Partial<Order> = {}): Order {
  return {
    _id: 'ord_1',
    status: 'confirmed',
    publicOrderId: 'SW-9',
    items: [{ name: 'Masala Dosa', quantity: 2, isVeg: true }],
    ...over,
  };
}

describe('buildKotHtml', () => {
  it('renders the order ref, restaurant and diet-marked items', () => {
    const html = buildKotHtml(makeOrder(), 'Test Kitchen');
    expect(html).toContain('Test Kitchen');
    expect(html).toContain('#SW-9');
    expect(html).toContain('[V] Masala Dosa');
    expect(html).toContain('2×');
  });

  it('escapes server strings so a note cannot inject markup', () => {
    const html = buildKotHtml(makeOrder({ restaurantNote: '<script>x</script>' }), 'K');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('falls back to "No items" when the server sends none', () => {
    expect(buildKotHtml(makeOrder({ items: [] }), 'K')).toContain('No items');
  });
});

describe('voice readout', () => {
  it('builds a speech line from server fields only', () => {
    const line = buildOrderSpeech(makeOrder({ customerName: 'Asha' }));
    expect(line).toBe('Order SW-9. Asha. 2 Masala Dosa.');
  });

  it('falls back to a generic customer noun when no name is sent', () => {
    expect(buildOrderSpeech(makeOrder({ items: [] }))).toContain('customer');
  });

  it('reports availability by feature detection', () => {
    // jsdom does not implement the Web Speech API, so this is false here.
    expect(typeof speechAvailable()).toBe('boolean');
  });
});
