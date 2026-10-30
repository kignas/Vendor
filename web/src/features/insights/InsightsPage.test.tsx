import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { InsightsPage } from './InsightsPage';

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <InsightsPage />
    </QueryClientProvider>,
  );
}

const overview = {
  period: '7d',
  current: { totalOrders: 86, sales: 48250, averageOrderValue: 652, cancelledOrders: 6 },
  previous: { totalOrders: 70, sales: 40000, averageOrderValue: 600, cancelledOrders: 5 },
  daily: [
    { date: '2026-10-24', orders: 8, sales: 4200 },
    { date: '2026-10-25', orders: 14, sales: 7800 },
    { date: '2026-10-26', orders: 11, sales: 6100 },
    { date: '2026-10-27', orders: 19, sales: 10500 },
    { date: '2026-10-28', orders: 12, sales: 6800 },
    { date: '2026-10-29', orders: 16, sales: 8900 },
    { date: '2026-10-30', orders: 6, sales: 3950 },
  ],
  paymentMix: [
    { method: 'online', orders: 60, amount: 34000 },
    { method: 'cod', orders: 26, amount: 14250 },
  ],
  dietMix: [
    { type: 'veg', orders: 40 },
    { type: 'non_veg', orders: 46 },
  ],
  topItems: [
    { name: 'Masala Dosa', quantity: 42, sales: 5460, spark: [3, 5, 4, 6, 8, 7, 9] },
    { name: 'Chicken Biryani', quantity: 30, sales: 7200, spark: [6, 4, 5, 3, 4, 6, 5] },
  ],
  worstItems: [{ name: 'Garden Salad', quantity: 1, sales: 120 }],
  peakHours: [
    { hour: 13, orders: 22 },
    { hour: 20, orders: 30 },
    { hour: 9, orders: 4 },
  ],
  visits: { totalViews: 320, uniqueVisitors: 180 },
};

function overviewHandler(payload: unknown = overview) {
  return http.get(`${API_BASE}/analytics/overview`, () =>
    HttpResponse.json({ success: true, data: payload }),
  );
}

describe('InsightsPage (analytics redesign)', () => {
  it('renders the 2x2 KPI cards with values and previous-period deltas', async () => {
    server.use(overviewHandler());
    renderPage();

    expect(await screen.findByText('Total orders')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Avg order value')).toBeInTheDocument();
    expect(screen.getByText('Cancellation rate')).toBeInTheDocument();

    expect(screen.getByText('86')).toBeInTheDocument();
    expect(screen.getByText('₹48,250')).toBeInTheDocument();
    expect(screen.getByText('₹652')).toBeInTheDocument();
    expect(screen.getByText('7%')).toBeInTheDocument();
    expect(screen.getByText('+22.9%')).toBeInTheDocument();
  });

  it('draws the gradient 7-day orders bar card and the sales-trend line card', async () => {
    server.use(overviewHandler());
    renderPage();

    expect(await screen.findByRole('img', { name: /orders.*last 7 days/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Sales trend/i })).toBeInTheDocument();
    const bars = within(screen.getByRole('img', { name: /orders.*last 7 days/i })).getAllByRole(
      'presentation',
    );
    expect(bars.length).toBeGreaterThanOrEqual(7);
  });

  it('shows a tooltip on a selected sales-trend point', async () => {
    const user = userEvent.setup();
    server.use(overviewHandler());
    renderPage();

    const point = await screen.findByRole('button', { name: /28 Oct.*₹6,800/i });
    await user.click(point);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(/₹6,800/);
  });

  it('renders the payment and diet donuts with a legend and numbers', async () => {
    server.use(overviewHandler());
    renderPage();

    expect(await screen.findByText('Online payment')).toBeInTheDocument();
    expect(screen.getByText('Cash on delivery')).toBeInTheDocument();
    expect(screen.getByText('Veg')).toBeInTheDocument();
    expect(screen.getByText('Non-veg')).toBeInTheDocument();
    expect(screen.getByText('60 orders')).toBeInTheDocument();
    expect(screen.getByText('46 orders')).toBeInTheDocument();
  });

  it('lists top dishes with counts and sparklines, plus worst sellers and peak hours', async () => {
    server.use(overviewHandler());
    renderPage();

    expect(await screen.findByRole('heading', { name: /Top dishes/i })).toBeInTheDocument();
    expect(screen.getByText('Masala Dosa')).toBeInTheDocument();
    expect(screen.getByText('42 orders')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Worst sellers/i })).toBeInTheDocument();
    expect(screen.getByText('Garden Salad')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Peak hours/i })).toBeInTheDocument();
    expect(screen.getByText('8–9 PM')).toBeInTheDocument();
  });

  it('re-queries with the selected period chip', async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    server.use(
      http.get(`${API_BASE}/analytics/overview`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('period') || '');
        return HttpResponse.json({ success: true, data: overview });
      }),
    );
    renderPage();

    await screen.findByText('86');
    await user.click(screen.getByRole('tab', { name: 'Today' }));
    expect(seen).toContain('today');
    await user.click(screen.getByRole('tab', { name: '30 days' }));
    expect(seen).toContain('30d');
  });

  it('falls back to the legacy endpoints while /analytics/overview is not deployed', async () => {
    server.use(
      http.get(`${API_BASE}/analytics/overview`, () =>
        HttpResponse.json({ message: 'not found' }, { status: 404 }),
      ),
      http.get(`${API_BASE}/analytics`, () =>
        HttpResponse.json({
          success: true,
          data: {
            period: '7d',
            summary: { totalOrders: 86, deliveredOrders: 74, deliveredFoodSales: 48250 },
            daily: [{ date: '2026-10-26', orders: 15, deliveredSales: 9100 }],
            topItems: [{ name: 'Masala Dosa', quantity: 42, sales: 5460 }],
          },
        }),
      ),
      http.get(`${API_BASE}/analytics/visits`, () =>
        HttpResponse.json({
          success: true,
          data: { summary: { totalViews: 320, uniqueVisitors: 180 }, daily: [], byEventType: [] },
        }),
      ),
    );
    renderPage();

    expect(await screen.findByText('86')).toBeInTheDocument();
    expect(screen.getByText('₹48,250')).toBeInTheDocument();
    expect(screen.getByText('Masala Dosa')).toBeInTheDocument();
  });

  it('shows the honest views note only while the beacon records nothing', async () => {
    server.use(overviewHandler({ ...overview, visits: { totalViews: 0, uniqueVisitors: 0 } }));
    renderPage();
    expect(await screen.findByRole('note')).toHaveTextContent(/not being recorded yet/i);
  });

  it('removes the views note once real views are recorded', async () => {
    server.use(overviewHandler());
    renderPage();
    await screen.findByText('86');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('shows an empty state when the period has no orders', async () => {
    server.use(
      overviewHandler({
        period: '7d',
        current: { totalOrders: 0 },
        previous: { totalOrders: 0 },
        daily: [],
        topItems: [],
        worstItems: [],
        peakHours: [],
        visits: { totalViews: 0, uniqueVisitors: 0 },
      }),
    );
    renderPage();
    expect(await screen.findByText(/No analytics for this period/i)).toBeInTheDocument();
  });

  it('shows an error state with retry when analytics fails', async () => {
    server.use(
      http.get(`${API_BASE}/analytics/overview`, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
      http.get(`${API_BASE}/analytics`, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
      http.get(`${API_BASE}/analytics/visits`, () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    );
    renderPage();
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      /Could not load analytics/i,
    );
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });
});
