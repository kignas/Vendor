import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { InsightsPage } from './InsightsPage';

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <InsightsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const ordersPayload = {
  period: '7d',
  currency: 'INR',
  summary: {
    totalOrders: 86,
    deliveredOrders: 74,
    cancelledOrders: 6,
    deliveredFoodSales: 48250,
    averageDeliveredOrderValue: 652,
  },
  daily: [
    { date: '2026-10-24', orders: 8, deliveredSales: 4200 },
    { date: '2026-10-25', orders: 14, deliveredSales: 7800 },
    { date: '2026-10-26', orders: 11, deliveredSales: 6100 },
  ],
  topItems: [{ name: 'Masala Dosa', quantity: 42, sales: 5460 }],
};

const visitsPayload = {
  period: '7d',
  summary: {
    totalViews: 320,
    uniqueVisitors: 180,
    itemViews: 900,
    addToCart: 140,
    checkoutInitiated: 60,
    completedOrders: 74,
    cancelledOrders: 4,
    refunds: 2,
    conversionRate: 41.1,
    revenue: 48000,
    attribution: { windowHours: 24 },
  },
  comparison: { viewsChangePct: 25, uniqueVisitorsChangePct: -10, completedOrdersChangePct: 5, conversionRateChangePct: 3.2 },
  daily: [
    { day: '2026-10-24', views: 100, uniqueVisitors: 60 },
    { day: '2026-10-25', views: 120, uniqueVisitors: 70 },
    { day: '2026-10-26', views: 100, uniqueVisitors: 50 },
  ],
  mostViewedItems: [
    { menuItemId: 'm1', name: 'Masala Dosa', views: 50, addToCart: 10, engagement: 20 },
    { menuItemId: 'm2', name: 'Butter Chicken', views: 80, addToCart: 24, engagement: 30 },
  ],
};

const performancePayload = {
  restaurantId: 'r1',
  name: 'Test Kitchen',
  score: 72.5,
  dataConfidence: 0.8,
  isNewRestaurant: false,
  computedAt: '2026-10-30T10:00:00.000Z',
  factors: [
    { key: 'ratings', label: 'Customer ratings', weight: 0.2, normalised: 0.9, raw: 4.6, hasData: true },
    { key: 'preparation', label: 'Preparation time', weight: 0.15, normalised: 0.5, raw: null, hasData: false },
  ],
  sample: { avgRating: 4.6, reviews: 30, completed: 74 },
  availability: { class: 'orderable', orderable: true, reason: '', label: 'Open' },
  ranking: { featured: true, pinned: false, sponsored: false, sponsorLabel: '' },
};

function handlers(overrides: { orders?: unknown; visits?: unknown; performance?: unknown } = {}) {
  return [
    http.get(`${API_BASE}/analytics`, () => HttpResponse.json({ success: true, data: overrides.orders ?? ordersPayload })),
    http.get(`${API_BASE}/analytics/visits`, () => HttpResponse.json({ success: true, data: overrides.visits ?? visitsPayload })),
    http.get(`${API_BASE}/performance`, () => HttpResponse.json({ success: true, data: overrides.performance ?? performancePayload })),
    http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ success: true, data: { _id: 'r1', name: 'Test Kitchen' } })),
  ];
}

describe('InsightsPage (analytics redesign)', () => {
  it('renders KPIs, trend and funnel from backend data without recomputing', async () => {
    server.use(...handlers());
    renderPage();

    // KPI row: 7 metrics, values read verbatim.
    expect(await screen.findByText('Menu views')).toBeInTheDocument();
    expect(screen.getAllByText('Unique visitors').length).toBeGreaterThan(0);
    expect(screen.getByText('Add-to-cart events')).toBeInTheDocument();
    expect(screen.getByText('Completed orders')).toBeInTheDocument();
    expect(screen.getByText('Conversion rate')).toBeInTheDocument();
    expect(screen.getByText('Cancelled orders')).toBeInTheDocument();
    expect(screen.getAllByText('Revenue').length).toBeGreaterThan(0);
    // 320 shows on the KPI face and again in the funnel (both backend values).
    expect(screen.getAllByText('320').length).toBeGreaterThan(0);
    expect(screen.getAllByText('180').length).toBeGreaterThan(0);
    // Conversion is the backend's 41.1, NOT 74/180 = 41.11.
    expect(screen.getByText('41.1%')).toBeInTheDocument();
    expect(screen.getAllByText('₹48,000').length).toBeGreaterThan(0);

    // Traffic trend chart (multi-series) is present.
    expect(screen.getByRole('img', { name: /menu views and unique visitors/i })).toBeInTheDocument();
    // Funnel uses backend counts.
    expect(screen.getByText('Conversion funnel')).toBeInTheDocument();
    expect(screen.getByText('Menu visits')).toBeInTheDocument();
    expect(screen.getByText('Checkout started')).toBeInTheDocument();
  });

  it('renders the previous-period delta with the correct sign', async () => {
    server.use(...handlers());
    renderPage();
    expect(await screen.findByText('+25%')).toBeInTheDocument();
    expect(screen.getByText('-10%')).toBeInTheDocument();
  });

  it('shows "Not enough data yet" instead of 0 when a metric is absent', async () => {
    server.use(
      ...handlers({
        orders: { period: '7d', summary: { totalOrders: 0 }, daily: [] },
        visits: { period: '7d', summary: { totalViews: 0, uniqueVisitors: 0 }, daily: [], mostViewedItems: [] },
      }),
    );
    renderPage();
    // All seven KPI cards show the honest empty label, never a 0.
    await waitFor(() => {
      expect(screen.getAllByText('Not enough data yet').length).toBeGreaterThanOrEqual(5);
    });
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('sends the selected period preset as a query param', async () => {
    const user = userEvent.setup();
    const seenOrders: string[] = [];
    const seenVisits: string[] = [];
    server.use(
      http.get(`${API_BASE}/analytics`, ({ request }) => {
        seenOrders.push(new URL(request.url).searchParams.get('period') || '');
        return HttpResponse.json({ success: true, data: ordersPayload });
      }),
      http.get(`${API_BASE}/analytics/visits`, ({ request }) => {
        seenVisits.push(new URL(request.url).searchParams.get('period') || '');
        return HttpResponse.json({ success: true, data: visitsPayload });
      }),
      http.get(`${API_BASE}/performance`, () => HttpResponse.json({ success: true, data: performancePayload })),
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ success: true, data: { name: 'Test Kitchen' } })),
    );
    renderPage();
    await screen.findAllByText('320');
    await user.click(screen.getByRole('tab', { name: 'Today' }));
    await waitFor(() => expect(seenOrders).toContain('today'));
    await user.click(screen.getByRole('tab', { name: '30 days' }));
    await waitFor(() => expect(seenOrders).toContain('30d'));
    await user.click(screen.getByRole('tab', { name: '90 days' }));
    await waitFor(() => expect(seenOrders).toContain('90d'));
    expect(seenVisits).toContain('90d');
  });

  it('keeps the page alive when the visit endpoint fails (order widgets survive)', async () => {
    server.use(
      http.get(`${API_BASE}/analytics`, () => HttpResponse.json({ success: true, data: ordersPayload })),
      http.get(`${API_BASE}/analytics/visits`, () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
      http.get(`${API_BASE}/performance`, () => HttpResponse.json({ success: true, data: performancePayload })),
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ success: true, data: { name: 'Test Kitchen' } })),
    );
    renderPage();
    // Order-side figures still render; the page is not blanked.
    expect((await screen.findAllByText('₹48,250')).length).toBeGreaterThan(0);
    expect(screen.getByText('Traffic trend')).toBeInTheDocument();
  });

  it('shows a retryable error for the order-side widgets when /analytics fails', async () => {
    server.use(
      http.get(`${API_BASE}/analytics`, () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
      http.get(`${API_BASE}/analytics/visits`, () => HttpResponse.json({ success: true, data: visitsPayload })),
      http.get(`${API_BASE}/performance`, () => HttpResponse.json({ success: true, data: performancePayload })),
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ success: true, data: { name: 'Test Kitchen' } })),
    );
    renderPage();
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      /Could not load order analytics/i,
    );
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    // Visit-based widgets still render.
    expect(screen.getByText('Traffic trend')).toBeInTheDocument();
  });

  it('shows the honest note while customer views are a true zero', async () => {
    server.use(
      ...handlers({
        visits: { period: '7d', summary: { totalViews: 0, uniqueVisitors: 0, completedOrders: 0 }, daily: [], mostViewedItems: [] },
      }),
    );
    renderPage();
    expect(await screen.findByRole('note')).toHaveTextContent(/not being recorded yet/i);
  });

  it('never sends a restaurantId for another restaurant (vendor isolation)', async () => {
    const urls: string[] = [];
    const bodies: string[] = [];
    server.use(
      http.get(`${API_BASE}/analytics`, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json({ success: true, data: ordersPayload });
      }),
      http.get(`${API_BASE}/analytics/visits`, ({ request }) => {
        urls.push(request.url);
        return HttpResponse.json({ success: true, data: visitsPayload });
      }),
      http.get(`${API_BASE}/performance`, ({ request }) => {
        urls.push(request.url);
        bodies.push('');
        return HttpResponse.json({ success: true, data: performancePayload });
      }),
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ success: true, data: { name: 'Test Kitchen' } })),
    );
    renderPage();
    await screen.findAllByText('320');
    for (const url of urls) {
      expect(new URL(url).searchParams.has('restaurantId')).toBe(false);
      expect(url).not.toMatch(/restaurantId=/);
    }
    expect(bodies.every((b) => b === '')).toBe(true);
  });

  it('handles a 403 from the performance route without crashing', async () => {
    server.use(
      http.get(`${API_BASE}/performance`, () =>
        HttpResponse.json({ success: false, message: 'Forbidden' }, { status: 403 }),
      ),
      ...handlers(),
    );
    renderPage();
    expect(await screen.findByText(/Could not load your performance score/i)).toBeInTheDocument();
    // The rest of the page still renders.
    expect(screen.getByText('Menu views')).toBeInTheDocument();
  });

  it('renders no customer personal data', async () => {
    server.use(...handlers());
    const { container } = renderPage();
    await screen.findAllByText('320');
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\b\d{10}\b/); // no phone numbers
    expect(text).not.toMatch(/@/); // no emails
    expect(text).not.toMatch(/customer name/i);
  });
});
