import { describe, expect, it } from 'vitest';
import {
  conversionRate,
  dailySeries,
  deltaLabel,
  hasSummaryData,
  orderRates,
  peakDay,
  viewsAreZero,
  withinPeriodTrend,
} from './growthDomain';

describe('dailySeries', () => {
  it('normalises date/orders/sales and drops dayless rows', () => {
    const series = dailySeries([
      { date: '2026-10-25T00:00:00Z', orders: 12, deliveredSales: 7600 },
      { day: '2026-10-26', count: 15, sales: 9100 },
      { orders: 4 },
    ]);
    expect(series).toHaveLength(2);
    expect(series[0]).toEqual({ day: '2026-10-25', orders: 12, sales: 7600 });
    expect(series[1]).toEqual({ day: '2026-10-26', orders: 15, sales: 9100 });
  });

  it('returns an empty array for missing data', () => {
    expect(dailySeries(undefined)).toEqual([]);
  });
});

describe('orderRates', () => {
  it('computes cancellation and fulfilment rates from server counts', () => {
    const rates = orderRates({ totalOrders: 86, deliveredOrders: 74, cancelledOrders: 6 });
    expect(rates.cancellationRate).toBeCloseTo(7.0, 1);
    expect(rates.deliveredRate).toBeCloseTo(86.0, 1);
  });

  it('returns null rates when there is no denominator', () => {
    const rates = orderRates({ cancelledOrders: 3 });
    expect(rates.cancellationRate).toBeNull();
    expect(rates.deliveredRate).toBeNull();
  });
});

describe('peakDay', () => {
  it('finds the busiest day', () => {
    const peak = peakDay([
      { day: 'a', orders: 3, sales: 0 },
      { day: 'b', orders: 9, sales: 0 },
      { day: 'c', orders: 5, sales: 0 },
    ]);
    expect(peak?.day).toBe('b');
  });

  it('returns null for an empty series', () => {
    expect(peakDay([])).toBeNull();
  });
});

describe('withinPeriodTrend', () => {
  it('compares the second half of the returned series to the first', () => {
    const points = [
      { day: '1', orders: 10, sales: 100 },
      { day: '2', orders: 10, sales: 100 },
      { day: '3', orders: 20, sales: 150 },
      { day: '4', orders: 20, sales: 150 },
    ];
    const t = withinPeriodTrend(points, 'sales');
    expect(t.firstHalf).toBe(200);
    expect(t.secondHalf).toBe(300);
    expect(t.changePct).toBe(50);
  });

  it('does not invent a percentage when the first half is zero', () => {
    const t = withinPeriodTrend(
      [
        { day: '1', orders: 0, sales: 0 },
        { day: '2', orders: 0, sales: 0 },
        { day: '3', orders: 5, sales: 50 },
        { day: '4', orders: 5, sales: 50 },
      ],
      'sales',
    );
    expect(t.changePct).toBeNull();
  });

  it('needs at least four points to split', () => {
    expect(withinPeriodTrend([{ day: '1', orders: 1, sales: 1 }], 'orders').changePct).toBeNull();
  });
});

describe('deltaLabel', () => {
  it('signs the value and passes null through', () => {
    expect(deltaLabel(12.5)).toBe('+12.5%');
    expect(deltaLabel(-4)).toBe('-4%');
    expect(deltaLabel(null)).toBeNull();
  });
});

describe('hasSummaryData', () => {
  it('is true only when a real metric is present', () => {
    expect(hasSummaryData({ totalOrders: 0 })).toBe(true);
    expect(hasSummaryData({})).toBe(false);
    expect(hasSummaryData(undefined)).toBe(false);
  });
});

describe('conversionRate', () => {
  it('divides orders by views and documents the denominator', () => {
    const c = conversionRate(86, 320);
    expect(c?.pct).toBeCloseTo(26.9, 1);
    expect(c?.denominator).toBe('views');
  });

  it('is undefined when there is no view denominator (never 0% or ∞)', () => {
    expect(conversionRate(10, 0)).toBeNull();
    expect(conversionRate(10, null)).toBeNull();
    expect(conversionRate(null, 100)).toBeNull();
  });
});

describe('viewsAreZero', () => {
  it('is true only for an explicit zero, not for an absent value', () => {
    expect(viewsAreZero(0)).toBe(true);
    expect(viewsAreZero(1)).toBe(false);
    expect(viewsAreZero(null)).toBe(false);
  });
});
