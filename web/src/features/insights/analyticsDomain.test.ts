import { describe, expect, it } from 'vitest';
import {
  buildFunnel,
  buildKpis,
  deltaLabel,
  funnelIsAllZero,
  funnelRows,
  normalizeAnalytics,
  normalizeOrders,
  normalizeVisits,
  orderBreakdown,
  sparklinePath,
  donutSegments,
} from './analyticsDomain';

describe('normalizeVisits', () => {
  it('reads the real envelope and unwraps data', () => {
    const out = normalizeVisits({
      success: true,
      data: {
        summary: {
          totalViews: 320,
          uniqueVisitors: 180,
          itemViews: 900,
          addToCart: 140,
          checkoutInitiated: 60,
          completedOrders: 40,
          cancelledOrders: 4,
          refunds: 2,
          conversionRate: 22.2,
          revenue: 48000,
          attribution: { windowHours: 24 },
        },
        comparison: { viewsChangePct: 12.5, uniqueVisitorsChangePct: -3, completedOrdersChangePct: 8 },
        daily: [{ day: '2026-10-25', views: 120, uniqueVisitors: 70 }],
        mostViewedItems: [{ menuItemId: 'm1', name: 'Dosa', views: 50, addToCart: 10, engagement: 20 }],
      },
    });
    expect(out.totalViews).toBe(320);
    expect(out.uniqueVisitors).toBe(180);
    expect(out.conversionRate).toBe(22.2);
    expect(out.attributionWindowHours).toBe(24);
    expect(out.daily[0]).toEqual({ day: '2026-10-25', views: 120, uniqueVisitors: 70 });
    expect(out.items[0]).toEqual({ id: 'm1', name: 'Dosa', views: 50, addToCart: 10, engagement: 20 });
    expect(out.comparison.viewsChangePct).toBe(12.5);
  });

  it('treats absent metrics as null (never a fabricated zero)', () => {
    const out = normalizeVisits({ data: { summary: { totalViews: 0, uniqueVisitors: 0 } } });
    expect(out.totalViews).toBe(0);
    expect(out.uniqueVisitors).toBe(0);
    expect(out.conversionRate).toBeNull();
    expect(out.addToCart).toBeNull();
    expect(out.revenue).toBeNull();
    expect(out.comparison.viewsChangePct).toBeNull();
    expect(out.daily).toEqual([]);
    expect(out.items).toEqual([]);
  });

  it('handles null/undefined entirely', () => {
    const out = normalizeVisits(undefined);
    expect(out.totalViews).toBeNull();
    expect(out.daily).toEqual([]);
  });

  it('prefers mostViewedItems but falls back to topItems', () => {
    const out = normalizeVisits({
      data: { topItems: [{ menuItemId: 'm9', name: 'Idli', views: 5 }] },
    });
    expect(out.items[0].name).toBe('Idli');
    expect(out.items[0].engagement).toBeNull();
  });
});

describe('normalizeOrders', () => {
  it('unwraps the order analytics envelope', () => {
    const out = normalizeOrders({
      success: true,
      data: {
        summary: { totalOrders: 86, deliveredOrders: 74, cancelledOrders: 6, deliveredFoodSales: 48250 },
        daily: [{ date: '2026-10-25', orders: 12, deliveredSales: 7600 }],
        topItems: [{ name: 'Masala Dosa', quantity: 42, sales: 5460 }],
      },
    });
    expect(out.totalOrders).toBe(86);
    expect(out.deliveredOrders).toBe(74);
    expect(out.deliveredFoodSales).toBe(48250);
    expect(out.daily[0]).toEqual({ date: '2026-10-25', orders: 12, deliveredSales: 7600 });
    expect(out.topItems[0]).toEqual({ name: 'Masala Dosa', quantity: 42, sales: 5460 });
  });

  it('leaves absent summary fields null', () => {
    const out = normalizeOrders({ data: { summary: { totalOrders: 0 } } });
    expect(out.totalOrders).toBe(0);
    expect(out.deliveredOrders).toBeNull();
    expect(out.deliveredFoodSales).toBeNull();
  });
});

describe('buildKpis', () => {
  const model = normalizeAnalytics(
    { data: { summary: { totalOrders: 86, deliveredOrders: 74, cancelledOrders: 6, deliveredFoodSales: 48250 }, daily: [{ date: '2026-10-25', orders: 12 }] } },
    {
      data: {
        summary: {
          totalViews: 320, uniqueVisitors: 180, addToCart: 140, completedOrders: 74,
          cancelledOrders: 4, conversionRate: 41.1, revenue: 48000,
        },
        comparison: { viewsChangePct: 25, uniqueVisitorsChangePct: -10, completedOrdersChangePct: 5 },
        daily: [{ day: '2026-10-25', views: 120, uniqueVisitors: 70 }],
      },
    },
  );

  it('reads every KPI from the backend, never recomputing it', () => {
    const kpis = buildKpis(model);
    const byKey = Object.fromEntries(kpis.map((k) => [k.key, k]));
    expect(byKey.views.value).toBe('320');
    expect(byKey.visitors.value).toBe('180');
    expect(byKey.addToCart.value).toBe('140');
    expect(byKey.completed.value).toBe('74');
    // Conversion is the backend's 41.1, not 74/180.
    expect(byKey.conversion.value).toBe('41.1%');
    expect(byKey.cancelled.value).toBe('4');
    expect(byKey.revenue.value).toBe('₹48,000');
  });

  it('marks cancellations as inverted (down is good)', () => {
    const cancelled = buildKpis(model).find((k) => k.key === 'cancelled');
    expect(cancelled?.invert).toBe(true);
  });

  it('shows null (not 0) for a metric the backend did not send', () => {
    const sparse = normalizeAnalytics({ data: { summary: { totalOrders: 0 } } }, { data: { summary: {} } });
    const kpis = buildKpis(sparse);
    // completed falls back to order-side deliveredOrders, which is absent => null.
    expect(kpis.find((k) => k.key === 'completed')?.value).toBeNull();
    expect(kpis.find((k) => k.key === 'conversion')?.value).toBeNull();
    expect(kpis.find((k) => k.key === 'revenue')?.value).toBeNull();
  });

  it('compacts large counts but keeps the full value in the tooltip', () => {
    const big = normalizeAnalytics({}, { data: { summary: { totalViews: 12500 } } });
    const views = buildKpis(big).find((k) => k.key === 'views');
    expect(views?.value).toBe('12.5K');
    expect(views?.full).toBe('12,500');
  });
});

describe('buildFunnel', () => {
  it('uses the backend counts and never invents a drop-off percentage', () => {
    const model = normalizeAnalytics({}, {
      data: { summary: { totalViews: 1000, itemViews: 800, addToCart: 200, checkoutInitiated: 90, completedOrders: 40 } },
    });
    const steps = buildFunnel(model);
    expect(steps.map((s) => s.value)).toEqual([1000, 800, 200, 90, 40]);
    const rows = funnelRows(steps);
    expect(rows[0].widthPct).toBe(100);
    expect(rows[1].widthPct).toBe(80);
    expect(funnelIsAllZero(steps)).toBe(false);
  });

  it('reports an all-zero funnel (beacon records nothing yet)', () => {
    const steps = buildFunnel(normalizeAnalytics({}, { data: { summary: { totalViews: 0, itemViews: 0, addToCart: 0, checkoutInitiated: 0, completedOrders: 0 } } }));
    expect(funnelIsAllZero(steps)).toBe(true);
  });
});

describe('orderBreakdown', () => {
  it('falls back to the order-side figures when the visit summary omits them', () => {
    const model = normalizeAnalytics(
      { data: { summary: { deliveredOrders: 74, cancelledOrders: 6, deliveredFoodSales: 48250 } } },
      { data: { summary: {} } },
    );
    const b = orderBreakdown(model);
    expect(b.completed).toBe(74);
    expect(b.cancelled).toBe(6);
    expect(b.revenue).toBe(48250);
    expect(b.refunds).toBeNull();
  });
});

describe('deltaLabel', () => {
  it('signs a delta and returns null without a value', () => {
    expect(deltaLabel(12.5)).toBe('+12.5%');
    expect(deltaLabel(-4)).toBe('-4%');
    expect(deltaLabel(0)).toBe('0%');
    expect(deltaLabel(null)).toBeNull();
    expect(deltaLabel(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('sparklinePath / donutSegments (presentation geometry)', () => {
  it('produces one point per value and is empty for fewer than two', () => {
    expect(sparklinePath([0, 5, 10], 100, 20).match(/L/g)).toHaveLength(2);
    expect(sparklinePath([], 100, 20)).toBe('');
    expect(sparklinePath([5], 100, 20)).toBe('');
  });

  it('centres a flat series instead of dividing by zero', () => {
    expect(sparklinePath([3, 3, 3], 100, 20)).not.toContain('NaN');
  });

  it('returns no donut segments for a zero total', () => {
    expect(donutSegments([{ key: 'a', label: 'A', value: 0 }])).toEqual([]);
  });
});
