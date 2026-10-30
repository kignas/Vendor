import { describe, expect, it } from 'vitest';
import {
  cancellationRatePct,
  dietMixFrom,
  donutSegments,
  hourLabel,
  kpiTiles,
  normalizeOverview,
  paymentMixFrom,
  peakHoursTop,
  percentChange,
  sparklinePath,
} from './analyticsDomain';

describe('percentChange', () => {
  it('computes a signed percentage change against the previous period', () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(80, 100)).toBe(-20);
    expect(percentChange(100, 100)).toBe(0);
  });

  it('returns null (never Infinity or NaN) when there is no baseline', () => {
    expect(percentChange(50, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
    expect(percentChange(null, 100)).toBeNull();
    expect(percentChange(100, null)).toBeNull();
    expect(percentChange(undefined, undefined)).toBeNull();
  });
});

describe('cancellationRatePct', () => {
  it('is cancelled ÷ total as a percentage', () => {
    expect(cancellationRatePct(6, 86)).toBeCloseTo(7.0, 1);
  });

  it('is null when there is no denominator (division by zero)', () => {
    expect(cancellationRatePct(0, 0)).toBeNull();
    expect(cancellationRatePct(3, 0)).toBeNull();
    expect(cancellationRatePct(null, 10)).toBeNull();
  });
});

describe('normalizeOverview', () => {
  it('reads the real envelope and unwraps data', () => {
    const out = normalizeOverview({
      success: true,
      data: {
        period: '7d',
        current: { totalOrders: 86, sales: 48250, averageOrderValue: 652, cancelledOrders: 6 },
        previous: { totalOrders: 70, sales: 40000, averageOrderValue: 600, cancelledOrders: 5 },
        daily: [{ date: '2026-10-25', orders: 12, sales: 7600 }],
        paymentMix: [
          { method: 'online', orders: 60, amount: 34000 },
          { method: 'cod', orders: 26, amount: 14250 },
        ],
        dietMix: [
          { type: 'veg', orders: 40 },
          { type: 'non_veg', orders: 46 },
        ],
        topItems: [{ name: 'Masala Dosa', quantity: 42, sales: 5460, spark: [1, 2, 3] }],
        worstItems: [{ name: 'Salad', quantity: 1, sales: 120 }],
        peakHours: [{ hour: 13, orders: 22 }],
        visits: { totalViews: 320, uniqueVisitors: 180 },
      },
    });
    expect(out.current.totalOrders).toBe(86);
    expect(out.previous.totalOrders).toBe(70);
    expect(out.daily[0]).toEqual({ date: '2026-10-25', orders: 12, sales: 7600 });
    expect(out.paymentMix).toHaveLength(2);
    expect(out.dietMix).toHaveLength(2);
    expect(out.topItems[0].name).toBe('Masala Dosa');
    expect(out.peakHours[0]).toEqual({ hour: 13, orders: 22 });
    expect(out.visits).toEqual({ totalViews: 320, uniqueVisitors: 180 });
  });

  it('tolerates a flat payload and missing blocks with safe empty defaults', () => {
    const out = normalizeOverview({ current: { totalOrders: 5 } });
    expect(out.current.totalOrders).toBe(5);
    expect(out.previous.totalOrders).toBeNull();
    expect(out.daily).toEqual([]);
    expect(out.paymentMix).toEqual([]);
    expect(out.dietMix).toEqual([]);
    expect(out.topItems).toEqual([]);
    expect(out.worstItems).toEqual([]);
    expect(out.peakHours).toEqual([]);
    expect(out.visits).toBeNull();
  });

  it('handles null/undefined entirely', () => {
    const out = normalizeOverview(undefined);
    expect(out.current.totalOrders).toBeNull();
    expect(out.daily).toEqual([]);
  });
});

describe('paymentMixFrom / dietMixFrom', () => {
  it('labels the known payment methods and keeps the numbers', () => {
    const mix = paymentMixFrom([
      { method: 'online', orders: 60, amount: 34000 },
      { method: 'cod', orders: 26, amount: 14250 },
    ]);
    expect(mix).toEqual([
      { key: 'online', label: 'Online payment', orders: 60, amount: 34000 },
      { key: 'cod', label: 'Cash on delivery', orders: 26, amount: 14250 },
    ]);
  });

  it('reads alternative field aliases and drops rows without a value', () => {
    const mix = paymentMixFrom([{ paymentMethod: 'upi', count: 10, total: 900 }, { method: 'cod' }]);
    expect(mix[0]).toMatchObject({ key: 'online', orders: 10, amount: 900 });
    expect(mix).toHaveLength(1);
  });

  it('maps diet rows to veg / non-veg with counts', () => {
    const diet = dietMixFrom([
      { type: 'veg', orders: 40 },
      { type: 'non_veg', count: 46 },
    ]);
    expect(diet).toEqual([
      { key: 'veg', label: 'Veg', orders: 40 },
      { key: 'non_veg', label: 'Non-veg', orders: 46 },
    ]);
  });
});

describe('donutSegments', () => {
  it('splits a full circle into percentage segments whose dashes sum to the circumference', () => {
    const segs = donutSegments([
      { key: 'a', label: 'A', value: 75 },
      { key: 'b', label: 'B', value: 25 },
    ]);
    expect(segs).toHaveLength(2);
    expect(segs[0].pct).toBeCloseTo(75, 1);
    expect(segs[1].pct).toBeCloseTo(25, 1);
    const circumference = 2 * Math.PI * segs[0].radius;
    const dashSum = segs.reduce((s, seg) => s + seg.dash, 0);
    expect(dashSum).toBeCloseTo(circumference, 3);
  });

  it('returns no segments for empty data or a zero total', () => {
    expect(donutSegments([])).toEqual([]);
    expect(
      donutSegments([
        { key: 'a', label: 'A', value: 0 },
        { key: 'b', label: 'B', value: 0 },
      ]),
    ).toEqual([]);
  });
});

describe('sparklinePath', () => {
  it('produces one point per value inside the viewBox', () => {
    const path = sparklinePath([0, 5, 10], 100, 20);
    expect(path.startsWith('M')).toBe(true);
    // 3 points => 2 line commands
    expect(path.match(/L/g)).toHaveLength(2);
  });

  it('is empty for fewer than two points', () => {
    expect(sparklinePath([], 100, 20)).toBe('');
    expect(sparklinePath([5], 100, 20)).toBe('');
  });

  it('centres a flat series instead of dividing by zero', () => {
    const path = sparklinePath([3, 3, 3], 100, 20);
    expect(path).not.toContain('NaN');
    expect(path.startsWith('M')).toBe(true);
  });
});

describe('peakHoursTop', () => {
  it('sorts by orders descending and limits to n', () => {
    const top = peakHoursTop(
      [
        { hour: 13, orders: 22 },
        { hour: 20, orders: 30 },
        { hour: 9, orders: 4 },
      ],
      2,
    );
    expect(top).toEqual([
      { hour: 20, orders: 30 },
      { hour: 13, orders: 22 },
    ]);
  });
});

describe('hourLabel', () => {
  it('formats a 24h hour as a 12h range label', () => {
    expect(hourLabel(13)).toBe('1–2 PM');
    expect(hourLabel(0)).toBe('12–1 AM');
    expect(hourLabel(12)).toBe('12–1 PM');
  });
});

describe('kpiTiles', () => {
  it('builds the four KPI tiles with deltas and never divides by zero', () => {
    const tiles = kpiTiles(
      { totalOrders: 86, sales: 48250, averageOrderValue: 652, cancelledOrders: 6 },
      { totalOrders: 70, sales: 40000, averageOrderValue: 600, cancelledOrders: 5 },
    );
    const keys = tiles.map((t) => t.key);
    expect(keys).toEqual(['orders', 'sales', 'aov', 'cancellation']);
    expect(tiles[0].delta).toBe('+22.9%');
    expect(tiles[1].delta).toBe('+20.6%');
    expect(tiles[3].value).toBe('7%');
    // Rate vs rate: 6/86 (7.0%) against 5/70 (7.1%) is a small decline.
    expect(tiles[3].delta).toBe('-1.4%');
  });

  it('omits the delta when there is no previous period', () => {
    const tiles = kpiTiles(
      { totalOrders: 86, sales: 48250, averageOrderValue: 652, cancelledOrders: 6 },
      undefined,
    );
    expect(tiles.every((t) => t.delta === null)).toBe(true);
    // With no denominator the cancellation tile still shows a real rate.
    expect(tiles[3].value).toBe('7%');
  });

  it('shows em dashes for a completely empty period', () => {
    const tiles = kpiTiles(undefined, undefined);
    expect(tiles.every((t) => t.value === null)).toBe(true);
  });
});
