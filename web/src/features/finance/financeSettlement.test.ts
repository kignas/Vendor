import { describe, expect, it } from 'vitest';
import { orderSettlementRows } from './financeDomain';

describe('orderSettlementRows (per-order base settlement)', () => {
  it('reads the base settlement (foodSales) and payable (net) from the backend', () => {
    const rows = orderSettlementRows([
      {
        orderNumber: 'SW-2001',
        status: 'delivered',
        createdAt: '2026-10-25T10:00:00.000Z',
        foodSales: 260,
        restaurantNetAmount: 221,
      },
    ]);
    expect(rows[0].orderNumber).toBe('SW-2001');
    expect(rows[0].baseSettlement).toBe(260);
    expect(rows[0].payable).toBe(221);
    expect(rows[0].status).toBe('delivered');
  });

  it('leaves a missing amount null instead of zero-filling', () => {
    const rows = orderSettlementRows([{ orderNumber: 'SW-2002' }]);
    expect(rows[0].baseSettlement).toBeNull();
    expect(rows[0].payable).toBeNull();
  });

  it('does not compute payable from base (they are independent backend fields)', () => {
    const rows = orderSettlementRows([{ orderNumber: 'SW-2003', foodSales: 500, restaurantNetAmount: 0 }]);
    // A backend net of 0 must stay 0, not be replaced by foodSales.
    expect(rows[0].payable).toBe(0);
  });
});
