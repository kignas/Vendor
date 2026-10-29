import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { fetchAnalytics, fetchVisits } from './analytics';

/**
 * The analytics service must unwrap the backend's `{ success, data }` envelope.
 * A regression here silently zeroes the Growth dashboard (see
 * docs/rebuild/ANALYTICS_ROOT_CAUSE.md), so these tests pin the real shape.
 */
describe('analytics service', () => {
  it('unwraps the { success, data } envelope from /analytics', async () => {
    server.use(
      http.get(`${API_BASE}/analytics`, () =>
        HttpResponse.json({
          success: true,
          data: { period: '7d', summary: { totalOrders: 86, deliveredFoodSales: 48250 }, daily: [] },
        }),
      ),
    );
    const res = await fetchAnalytics('7d');
    expect(res.summary?.totalOrders).toBe(86);
    expect(res.summary?.deliveredFoodSales).toBe(48250);
    expect(res.period).toBe('7d');
  });

  it('still tolerates a flat payload (defensive against a backend change)', async () => {
    server.use(
      http.get(`${API_BASE}/analytics`, () =>
        HttpResponse.json({ period: '7d', summary: { totalOrders: 5 }, daily: [] }),
      ),
    );
    const res = await fetchAnalytics('7d');
    expect(res.summary?.totalOrders).toBe(5);
  });

  it('unwraps the visits envelope and returns null on failure', async () => {
    server.use(
      http.get(`${API_BASE}/analytics/visits`, () =>
        HttpResponse.json({
          success: true,
          data: { summary: { totalViews: 320, uniqueVisitors: 180 }, daily: [], byEventType: [] },
        }),
      ),
    );
    const res = await fetchVisits('7d');
    expect(res?.summary?.totalViews).toBe(320);
    expect(res?.summary?.uniqueVisitors).toBe(180);

    server.use(
      http.get(`${API_BASE}/analytics/visits`, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );
    expect(await fetchVisits('7d')).toBeNull();
  });
});
