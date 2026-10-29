import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { OrdersPage } from '@/features/orders/OrdersPage';

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const placedOrder = {
  _id: 'ord_1',
  publicOrderId: 'SW-1001',
  status: 'placed',
  customerName: 'Asha Rao',
  createdAt: new Date().toISOString(),
  restaurantResponseDeadline: new Date(Date.now() + 5 * 60_000).toISOString(),
  items: [{ name: 'Masala Dosa', quantity: 2, isVeg: true }],
  paymentStatus: 'paid',
  vendorBill: { itemSubtotal: 260, commission: 39, restaurantNetAmount: 221 },
};

function queueHandlers(orders: unknown[]) {
  server.use(
    http.get(`${API_BASE}/restaurant`, () =>
      HttpResponse.json({ data: { _id: 'r1', name: 'Test Kitchen', availability: 'open' } }),
    ),
    http.get(`${API_BASE}/orders`, ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get('view') === 'history') {
        return HttpResponse.json({ data: { rows: [], total: 0 } });
      }
      return HttpResponse.json({ data: orders });
    }),
  );
}

describe('OrdersPage', () => {
  it('renders a new order with the server total and payment state', async () => {
    queueHandlers([placedOrder]);
    renderPage();

    const card = await screen.findByRole('article', { name: /Order SW-1001/i });
    // ₹221 appears as the card total and again as the bill's net receivable.
    expect(within(card).getAllByText('₹221').length).toBeGreaterThanOrEqual(1);
    expect(within(card).getByText(/Paid online/i)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /^Accept$/ })).toBeInTheDocument();
  });

  it('accept posts prepMinutes and refetches (server stays authoritative)', async () => {
    const user = userEvent.setup();
    let accepted = false;
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ data: { _id: 'r1' } })),
      http.get(`${API_BASE}/orders`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('view') === 'history') return HttpResponse.json({ data: { rows: [] } });
        return HttpResponse.json({ data: accepted ? [{ ...placedOrder, status: 'confirmed' }] : [placedOrder] });
      }),
      http.put(`${API_BASE}/orders/ord_1/accept`, async ({ request }) => {
        const body = (await request.json()) as { prepMinutes: number };
        expect(body.prepMinutes).toBe(25);
        accepted = true;
        return HttpResponse.json({ success: true });
      }),
    );
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^Accept$/ }));
    const sheet = await screen.findByRole('dialog', { name: /Accept order/i });
    await user.click(within(sheet).getByRole('button', { name: /^25 min$/ }));
    await user.click(within(sheet).getByRole('button', { name: /Confirm/i }));

    // The queue refetches and the order moves to "preparing" — proven by the
    // card leaving the New tab.
    await waitFor(() => expect(screen.getByText(/No new orders yet/i)).toBeInTheDocument());
  });

  it('a double tap fires the accept request once', async () => {
    const user = userEvent.setup();
    const accept = vi.fn(() => HttpResponse.json({ success: true }));
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ data: { _id: 'r1' } })),
      http.get(`${API_BASE}/orders`, () => HttpResponse.json({ data: [placedOrder] })),
      http.put(`${API_BASE}/orders/ord_1/accept`, accept),
    );
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^Accept$/ }));
    const sheet = await screen.findByRole('dialog', { name: /Accept order/i });
    const confirm = within(sheet).getByRole('button', { name: /Confirm/i });
    await user.click(confirm);
    await user.click(confirm);
    await user.click(confirm);

    await waitFor(() => expect(accept).toHaveBeenCalledTimes(1));
  });

  it('an expired acceptance window disables Accept', async () => {
    queueHandlers([
      {
        ...placedOrder,
        restaurantResponseDeadline: new Date(Date.now() - 60_000).toISOString(),
      },
    ]);
    renderPage();

    const card = await screen.findByRole('article', { name: /Order SW-1001/i });
    expect(within(card).getByText(/expired/i)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /^Accept$/ })).toBeDisabled();
  });
});
