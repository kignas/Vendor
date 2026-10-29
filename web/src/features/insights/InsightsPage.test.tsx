import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('InsightsPage', () => {
  it('renders analytics KPIs from the real { success, data } envelope', async () => {
    // The backend wraps every payload in `{ success: true, data: {...} }`.
    // Stubbing the flat shape (as an earlier test did) hid a bug where the page
    // read `summary` one level too high and rendered zero for every KPI.
    server.use(
      http.get(`${API_BASE}/analytics`, () =>
        HttpResponse.json({
          success: true,
          data: {
            period: '7d',
            currency: 'INR',
            summary: {
              totalOrders: 86,
              deliveredOrders: 74,
              cancelledOrders: 6,
              deliveredFoodSales: 48250,
              averageDeliveredOrderValue: 652,
            },
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
    expect(screen.getByText('74')).toBeInTheDocument();
    expect(screen.getByText('₹48,250')).toBeInTheDocument();
    expect(screen.getByText('42 sold · ₹5,460')).toBeInTheDocument();
    expect(screen.getByText('Menu views')).toBeInTheDocument();
    expect(screen.getByText('320')).toBeInTheDocument();
    // conversion = 86 orders ÷ 320 views = 26.9%
    expect(screen.getByText('26.9%')).toBeInTheDocument();
  });

  it('shows the honest views note when the beacon has recorded nothing', async () => {
    server.use(
      http.get(`${API_BASE}/analytics`, () =>
        HttpResponse.json({
          success: true,
          data: { period: '7d', summary: { totalOrders: 12, deliveredOrders: 10 } },
        }),
      ),
      http.get(`${API_BASE}/analytics/visits`, () =>
        HttpResponse.json({
          success: true,
          data: { summary: { totalViews: 0, uniqueVisitors: 0 }, daily: [], byEventType: [] },
        }),
      ),
    );
    renderPage();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/not being recorded yet/i);
    // No conversion card when the denominator is zero.
    expect(screen.queryByText('Conversion')).not.toBeInTheDocument();
  });

  it('re-queries with the selected period', async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    server.use(
      http.get(`${API_BASE}/analytics`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('period') || '');
        return HttpResponse.json({
          success: true,
          data: { period: 'x', summary: { totalOrders: 1 }, daily: [], topItems: [] },
        });
      }),
      http.get(`${API_BASE}/analytics/visits`, () => HttpResponse.json({ success: true, data: {} })),
    );
    renderPage();

    await screen.findByText('1');
    await user.click(screen.getByRole('tab', { name: '30 days' }));
    expect(seen).toContain('30d');
  });

  it('shows an error state with retry when analytics fails', async () => {
    server.use(
      http.get(`${API_BASE}/analytics`, () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
      http.get(`${API_BASE}/analytics/visits`, () => HttpResponse.json({ success: true, data: {} })),
    );
    renderPage();
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      /Could not load analytics/i,
    );
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });
});
