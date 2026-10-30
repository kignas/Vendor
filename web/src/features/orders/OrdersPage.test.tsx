import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { useUiStore } from '@/app/uiStore';
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
    // The card carries the reference Accept/Reject pair; Accept opens the sheet.
    expect(within(card).getByRole('button', { name: /^Accept$/ })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /^Reject$/ })).toBeInTheDocument();
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
    await user.click(within(sheet).getByRole('button', { name: /^Accept$/ }));

    // The queue refetches and the order moves to "preparing" — proven by the
    // card leaving the New tab.
    await waitFor(() => expect(screen.getByText(/No new orders yet/i)).toBeInTheDocument());

    // ...and landing in the Preparing tab from the authoritative server state.
    await user.click(screen.getByRole('tab', { name: /Preparing/i }));
    expect(await screen.findByRole('article', { name: /Order SW-1001/i })).toBeInTheDocument();
  });

  it('shows the "you are offline" banner while the restaurant is paused', async () => {
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({
          data: { _id: 'r1', name: 'Test Kitchen', availability: 'temporarily_closed' },
        }),
      ),
      http.get(`${API_BASE}/orders`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('view') === 'history') return HttpResponse.json({ data: { rows: [] } });
        return HttpResponse.json({ data: [placedOrder] });
      }),
    );
    renderPage();

    // The banner is server-authoritative and appears next to the live queue;
    // the existing new order is still shown and actionable.
    expect(await screen.findByText(/You are offline/i)).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Order SW-1001/i })).toBeInTheDocument();
  });

  it('hides the offline banner when the restaurant is accepting orders', async () => {
    queueHandlers([placedOrder]);
    renderPage();

    await screen.findByRole('article', { name: /Order SW-1001/i });
    expect(screen.queryByText(/You are offline/i)).not.toBeInTheDocument();
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
    const confirm = within(sheet).getByRole('button', { name: /^Accept$/ });
    await user.click(confirm);
    await user.click(confirm);
    await user.click(confirm);

    await waitFor(() => expect(accept).toHaveBeenCalledTimes(1));
  });

  it('reject sends the reason and refetches the queue', async () => {
    const user = userEvent.setup();
    let rejected = false;
    let sentReason = '';
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ data: { _id: 'r1' } })),
      http.get(`${API_BASE}/orders`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('view') === 'history') return HttpResponse.json({ data: { rows: [] } });
        return HttpResponse.json({ data: rejected ? [] : [placedOrder] });
      }),
      http.put(`${API_BASE}/orders/ord_1/reject`, async ({ request }) => {
        const body = (await request.json()) as { reason: string };
        sentReason = body.reason;
        rejected = true;
        return HttpResponse.json({ success: true });
      }),
    );
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^Reject$/ }));
    const sheet = await screen.findByRole('dialog', { name: /Reject order/i });
    const confirm = within(sheet).getByRole('button', { name: /Reject order/i });
    // The reason is required: the confirm stays disabled until one is typed.
    expect(confirm).toBeDisabled();
    await user.type(within(sheet).getByPlaceholderText(/Reason/i), 'Out of stock');
    await user.click(confirm);

    await waitFor(() => expect(sentReason).toBe('Out of stock'));
    // The order leaves the New tab only from the authoritative refetch.
    await waitFor(() => expect(screen.getByText(/No new orders yet/i)).toBeInTheDocument());
  });

  it('a failed accept surfaces an error and never advances the order', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ data: { _id: 'r1' } })),
      http.get(`${API_BASE}/orders`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('view') === 'history') return HttpResponse.json({ data: { rows: [] } });
        return HttpResponse.json({ data: [placedOrder] });
      }),
      http.put(`${API_BASE}/orders/ord_1/accept`, () =>
        HttpResponse.json({ message: 'Order already accepted' }, { status: 409 }),
      ),
    );
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^Accept$/ }));
    const sheet = await screen.findByRole('dialog', { name: /Accept order/i });
    await user.click(within(sheet).getByRole('button', { name: /^Accept$/ }));

    // The server rejected it, so the order must stay in the New tab (no
    // optimistic advance) and the sheet stays open for a retry.
    await waitFor(() =>
      expect(screen.getByRole('article', { name: /Order SW-1001/i })).toBeInTheDocument(),
    );
    expect(screen.queryByText(/No new orders yet/i)).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /Accept order/i })).toBeInTheDocument();
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
    expect(within(card).getByText(/Response window expired/i)).toBeInTheDocument();
  });

  it('marking ready opens the 15-second undo window and undo calls the endpoint', async () => {
    const user = userEvent.setup();
    let undone = false;
    const readyOrder = {
      ...placedOrder,
      status: 'preparing',
      prepReadyAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ data: { _id: 'r1' } })),
      http.get(`${API_BASE}/orders`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('view') === 'history') return HttpResponse.json({ data: { rows: [] } });
        return HttpResponse.json({ data: [readyOrder] });
      }),
      http.put(`${API_BASE}/orders/ord_1/ready`, () => HttpResponse.json({ success: true })),
      http.put(`${API_BASE}/orders/ord_1/undo-ready`, () => {
        undone = true;
        return HttpResponse.json({ success: true });
      }),
    );
    renderPage();

    // Switch to the Preparing tab.
    await user.click(await screen.findByRole('tab', { name: /Preparing/i }));
    const ready = await screen.findByRole('button', { name: /Order Ready/i });
    await user.click(ready);

    const undo = await screen.findByRole('button', { name: /Undo Ready \(\d+s\)/i });
    await user.click(undo);
    await waitFor(() => expect(undone).toBe(true));
  });

  it('extend-prep is one-time: the chip disables after the first call', async () => {
    const user = userEvent.setup();
    let extendCalls = 0;
    const readyOrder = {
      ...placedOrder,
      status: 'preparing',
      prepReadyAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ data: { _id: 'r1' } })),
      http.get(`${API_BASE}/orders`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('view') === 'history') return HttpResponse.json({ data: { rows: [] } });
        return HttpResponse.json({ data: [readyOrder] });
      }),
      http.put(`${API_BASE}/orders/ord_1/extend-prep`, () => {
        extendCalls += 1;
        return HttpResponse.json({ success: true });
      }),
    );
    renderPage();

    await user.click(await screen.findByRole('tab', { name: /Preparing/i }));
    const chip = await screen.findByRole('button', { name: /^\+5 min$/ });
    await user.click(chip);
    await waitFor(() => expect(extendCalls).toBe(1));
    // After a successful extension the chip shows the used state and is disabled.
    const used = await screen.findByRole('button', { name: /\+5 min added/ });
    expect(used).toBeDisabled();
    await user.click(used);
    expect(extendCalls).toBe(1);
  });

  it('shows the confirmation flash only after the server accepts the order', async () => {
    const user = userEvent.setup();
    const gate: { release?: () => void } = {};
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ data: { _id: 'r1' } })),
      http.get(`${API_BASE}/orders`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('view') === 'history') return HttpResponse.json({ data: { rows: [] } });
        return HttpResponse.json({ data: [placedOrder] });
      }),
      http.put(`${API_BASE}/orders/ord_1/accept`, async () => {
        // Hold the response so we can prove the flash is NOT shown before the
        // server confirms.
        await new Promise<void>((resolve) => {
          gate.release = resolve;
        });
        return HttpResponse.json({ success: true });
      }),
    );
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^Accept$/ }));
    const sheet = await screen.findByRole('dialog', { name: /Accept order/i });
    await user.click(within(sheet).getByRole('button', { name: /^Accept$/ }));

    // Request in flight: no success flash yet.
    expect(screen.queryByText(/Order accepted/i)).not.toBeInTheDocument();

    gate.release?.();
    expect(await screen.findByText(/Order accepted/i)).toBeInTheDocument();
  });

  it('shows the search input only when opened, and filters the list', async () => {
    const user = userEvent.setup();
    queueHandlers([
      placedOrder,
      { ...placedOrder, _id: 'ord_2', publicOrderId: 'SW-2002', customerName: 'Bala Iyer' },
    ]);
    act(() => useUiStore.setState({ searchOpen: false, orderQuery: '' }));
    renderPage();

    // Both orders are visible; no search box until the header icon opens it.
    expect(await screen.findByRole('article', { name: /Order SW-1001/i })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Order SW-2002/i })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: /search orders/i })).not.toBeInTheDocument();

    // Opening the search reveals the input; typing filters the queue.
    act(() => useUiStore.setState({ searchOpen: true }));
    const input = await screen.findByRole('searchbox', { name: /search orders/i });
    await user.type(input, 'Bala');
    await waitFor(() =>
      expect(screen.queryByRole('article', { name: /Order SW-1001/i })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('article', { name: /Order SW-2002/i })).toBeInTheDocument();

    // The close button clears the query and hides the input again.
    await user.click(screen.getByRole('button', { name: /close order search/i }));
    expect(useUiStore.getState().searchOpen).toBe(false);
    expect(useUiStore.getState().orderQuery).toBe('');
  });
});
