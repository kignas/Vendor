import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
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
      {/* Toasts are part of the feedback contract; render the real Toaster so
          the "already accepted" / error paths are asserted as the user sees them. */}
      <Toaster />
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

/** A placed order, accepted — lands in the Preparing group (the default chip). */
const confirmedOrder = { ...placedOrder, status: 'confirmed' };

function queueHandlers(orders: unknown[]) {
  server.use(
    http.get(`${API_BASE}/restaurant`, () =>
      HttpResponse.json({ data: { _id: 'r1', name: 'Test Kitchen', availability: 'open' } }),
    ),
    http.get(`${API_BASE}/orders`, () => HttpResponse.json({ data: orders })),
  );
}

/** New orders no longer live in a list tab; the new-order bar opens their sheet. */
async function openNewOrderSheet(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /new orders? — open/i }));
  return screen.findByRole('dialog', { name: /Accept order/i });
}

describe('OrdersPage', () => {
  it('renders an order in the default Preparing group with the server total and payment state', async () => {
    queueHandlers([confirmedOrder]);
    renderPage();

    const card = await screen.findByRole('article', { name: /Order SW-1001/i });
    // ₹221 appears as the card total and again as the bill's net receivable.
    expect(within(card).getAllByText('₹221').length).toBeGreaterThanOrEqual(1);
    expect(within(card).getByText(/^PAID$/i)).toBeInTheDocument();
  });

  it('maps the three chips to the existing order groups with counts, defaulting to Preparing', async () => {
    queueHandlers([
      confirmedOrder,
      { ...placedOrder, _id: 'r1', publicOrderId: 'SW-3003', status: 'waiting_for_rider' },
      { ...placedOrder, _id: 'd1', publicOrderId: 'SW-5005', status: 'out_for_delivery' },
    ]);
    renderPage();

    const preparing = await screen.findByRole('tab', { name: /Preparing \(1\)/i });
    expect(preparing).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Ready \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Picked up \(1\)/i })).toBeInTheDocument();
    // The old New / History tabs are gone from this page.
    expect(screen.queryByRole('tab', { name: /^New\b/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^History\b/i })).not.toBeInTheDocument();
  });

  it('shows a Scheduled chip only while scheduled orders exist', async () => {
    queueHandlers([
      confirmedOrder,
      {
        ...placedOrder,
        _id: 's1',
        publicOrderId: 'SW-4004',
        scheduledAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      },
    ]);
    renderPage();

    expect(await screen.findByRole('tab', { name: /Scheduled \(1\)/i })).toBeInTheDocument();
  });

  it('hides the Scheduled chip when nothing is scheduled', async () => {
    queueHandlers([confirmedOrder]);
    renderPage();

    await screen.findByRole('article', { name: /Order SW-1001/i });
    expect(screen.queryByRole('tab', { name: /Scheduled/i })).not.toBeInTheDocument();
  });

  it('switching chips shows the orders in that group', async () => {
    const user = userEvent.setup();
    queueHandlers([
      confirmedOrder,
      { ...placedOrder, _id: 'd1', publicOrderId: 'SW-5005', status: 'out_for_delivery' },
    ]);
    renderPage();

    // Preparing is default: only its order is listed.
    expect(await screen.findByRole('article', { name: /Order SW-1001/i })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: /Order SW-5005/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Picked up \(1\)/i }));
    expect(await screen.findByRole('article', { name: /Order SW-5005/i })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: /Order SW-1001/i })).not.toBeInTheDocument();
  });

  it('accept posts prepMinutes and refetches (server stays authoritative)', async () => {
    const user = userEvent.setup();
    let accepted = false;
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ data: { _id: 'r1' } })),
      http.get(`${API_BASE}/orders`, () =>
        HttpResponse.json({ data: accepted ? [{ ...placedOrder, status: 'confirmed' }] : [placedOrder] }),
      ),
      http.put(`${API_BASE}/orders/ord_1/accept`, async ({ request }) => {
        const body = (await request.json()) as { prepMinutes: number };
        expect(body.prepMinutes).toBe(25);
        accepted = true;
        return HttpResponse.json({ success: true });
      }),
    );
    renderPage();

    const sheet = await openNewOrderSheet(user);
    // The stepper is a bordered [-]/[+] control: step 20 -> 25.
    await user.click(within(sheet).getByRole('button', { name: /Increase prep time/i }));
    await user.click(within(sheet).getByRole('button', { name: /^Accept/ }));

    // The queue refetches and the order moves to "preparing" — proven by the
    // authoritative server state landing under the default chip.
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Preparing \(1\)/i })).toBeInTheDocument(),
    );
    expect(await screen.findByRole('article', { name: /Order SW-1001/i })).toBeInTheDocument();
    // Nothing is waiting, so the new-order bar is gone.
    expect(screen.queryByText(/new order/i)).not.toBeInTheDocument();
  });

  it('shows the "you are offline" banner while the restaurant is paused', async () => {
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({
          data: { _id: 'r1', name: 'Test Kitchen', availability: 'temporarily_closed' },
        }),
      ),
      http.get(`${API_BASE}/orders`, () => HttpResponse.json({ data: [confirmedOrder] })),
    );
    renderPage();

    // The banner is server-authoritative and appears next to the live queue;
    // the existing order is still shown and actionable.
    expect(await screen.findByText(/You are offline/i)).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Order SW-1001/i })).toBeInTheDocument();
  });

  it('hides the offline banner when the restaurant is accepting orders', async () => {
    queueHandlers([confirmedOrder]);
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

    const sheet = await openNewOrderSheet(user);
    const confirm = within(sheet).getByRole('button', { name: /^Accept/ });
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
      http.get(`${API_BASE}/orders`, () =>
        HttpResponse.json({ data: rejected ? [] : [placedOrder] }),
      ),
      http.put(`${API_BASE}/orders/ord_1/reject`, async ({ request }) => {
        const body = (await request.json()) as { reason: string };
        sentReason = body.reason;
        rejected = true;
        return HttpResponse.json({ success: true });
      }),
    );
    renderPage();

    const sheet = await openNewOrderSheet(user);
    await user.click(within(sheet).getByRole('button', { name: /^Reject$/ }));
    const rejectSheet = await screen.findByRole('dialog', { name: /Reject order/i });
    const confirm = within(rejectSheet).getByRole('button', { name: /Reject order/i });
    // The reason is required: the confirm stays disabled until one is typed.
    expect(confirm).toBeDisabled();
    await user.type(within(rejectSheet).getByPlaceholderText(/Reason/i), 'Out of stock');
    await user.click(confirm);

    await waitFor(() => expect(sentReason).toBe('Out of stock'));
    // The order disappears only from the authoritative refetch — the queue is
    // empty and no new-order BAR is left behind (assert the bar's control, not
    // the words "new order", which the empty-state copy also contains).
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /new orders? — open/i })).not.toBeInTheDocument(),
    );
  });

  it('a failed accept surfaces an error and never advances the order', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ data: { _id: 'r1' } })),
      http.get(`${API_BASE}/orders`, () => HttpResponse.json({ data: [placedOrder] })),
      http.put(`${API_BASE}/orders/ord_1/accept`, () =>
        HttpResponse.json({ message: 'Order already accepted' }, { status: 409 }),
      ),
    );
    renderPage();

    const sheet = await openNewOrderSheet(user);
    await user.click(within(sheet).getByRole('button', { name: /^Accept/ }));

    // The server rejected it, so nothing advances: the order is still waiting
    // (the new-order bar is present) and the sheet stays open for a retry.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /new orders? — open/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('dialog', { name: /Accept order/i })).toBeInTheDocument();
  });

  it('pages between several waiting orders with "1 of N"', async () => {
    const user = userEvent.setup();
    queueHandlers([
      { ...placedOrder, _id: 'ord_1', publicOrderId: 'SW-1001' },
      { ...placedOrder, _id: 'ord_2', publicOrderId: 'SW-2002' },
    ]);
    renderPage();

    const sheet = await openNewOrderSheet(user);
    expect(within(sheet).getByText('2 new orders')).toBeInTheDocument();
    expect(within(sheet).getByText(/ID: SW-1001/)).toBeInTheDocument();

    await user.click(within(sheet).getByRole('button', { name: /^Next$/ }));
    expect(within(sheet).getByText(/ID: SW-2002/)).toBeInTheDocument();
  });

  it('shows the dark "Order already accepted" toast when the refetch says it moved on', async () => {
    const user = userEvent.setup();
    // The order is accepted elsewhere: the accept 409s and the refetched queue
    // no longer lists it as `placed`.
    let movedOn = false;
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ data: { _id: 'r1' } })),
      http.get(`${API_BASE}/orders`, () =>
        HttpResponse.json({ data: movedOn ? [] : [placedOrder] }),
      ),
      http.put(`${API_BASE}/orders/ord_1/accept`, () => {
        movedOn = true;
        return HttpResponse.json({ message: 'Order already accepted' }, { status: 409 });
      }),
    );
    renderPage();

    const sheet = await openNewOrderSheet(user);
    await user.click(within(sheet).getByRole('button', { name: /^Accept/ }));

    expect(await screen.findByText('Order already accepted')).toBeInTheDocument();
  });

  it('shows the real error message when a failed accept is NOT an already-accepted order', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ data: { _id: 'r1' } })),
      // The order is still placed after the refetch, so this is a genuine error.
      http.get(`${API_BASE}/orders`, () => HttpResponse.json({ data: [placedOrder] })),
      http.put(`${API_BASE}/orders/ord_1/accept`, () =>
        HttpResponse.json({ message: 'Kitchen is closed' }, { status: 400 }),
      ),
    );
    renderPage();

    const sheet = await openNewOrderSheet(user);
    await user.click(within(sheet).getByRole('button', { name: /^Accept/ }));

    expect(await screen.findByText('Kitchen is closed')).toBeInTheDocument();
    expect(screen.queryByText('Order already accepted')).not.toBeInTheDocument();
  });

  it('an expired acceptance window disables Accept', async () => {
    const user = userEvent.setup();
    queueHandlers([
      {
        ...placedOrder,
        restaurantResponseDeadline: new Date(Date.now() - 60_000).toISOString(),
      },
    ]);
    renderPage();

    const sheet = await openNewOrderSheet(user);
    expect(within(sheet).getByText(/Response window expired/i)).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: /^Accept/ })).toBeDisabled();
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
      http.get(`${API_BASE}/orders`, () => HttpResponse.json({ data: [readyOrder] })),
      http.put(`${API_BASE}/orders/ord_1/ready`, () => HttpResponse.json({ success: true })),
      http.put(`${API_BASE}/orders/ord_1/undo-ready`, () => {
        undone = true;
        return HttpResponse.json({ success: true });
      }),
    );
    renderPage();

    // Preparing is the default chip, so the card is already on screen.
    const ready = await screen.findByRole('button', { name: /Order Ready/i });
    await user.click(ready);

    const undo = await screen.findByRole('button', { name: /Undo Ready \(\d+s\)/i });
    await user.click(undo);
    await waitFor(() => expect(undone).toBe(true));
  });

  it('extend-prep is one-time: the menu item disables after the first call', async () => {
    const user = userEvent.setup();
    let extendCalls = 0;
    const readyOrder = {
      ...placedOrder,
      status: 'preparing',
      prepReadyAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ data: { _id: 'r1' } })),
      http.get(`${API_BASE}/orders`, () => HttpResponse.json({ data: [readyOrder] })),
      http.put(`${API_BASE}/orders/ord_1/extend-prep`, () => {
        extendCalls += 1;
        return HttpResponse.json({ success: true });
      }),
    );
    renderPage();

    // Extend prep now lives in the card's kebab menu (Phase 3, Step 5).
    await user.click(await screen.findByRole('button', { name: /Order actions/i }));
    const item = await screen.findByRole('menuitem', { name: /Extend prep \(\+5 min\)/i });
    await user.click(item);
    await waitFor(() => expect(extendCalls).toBe(1));
    // After a successful extension the item shows the used state and is disabled.
    await user.click(screen.getByRole('button', { name: /Order actions/i }));
    const used = await screen.findByRole('menuitem', { name: /\+5 min added/ });
    expect(used).toBeDisabled();
    await user.click(used);
    expect(extendCalls).toBe(1);
  });

  it('shows the confirmation flash only after the server accepts the order', async () => {
    const user = userEvent.setup();
    const gate: { release?: () => void } = {};
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ data: { _id: 'r1' } })),
      http.get(`${API_BASE}/orders`, () => HttpResponse.json({ data: [placedOrder] })),
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

    const sheet = await openNewOrderSheet(user);
    await user.click(within(sheet).getByRole('button', { name: /^Accept/ }));

    // Request in flight: no success flash yet.
    expect(screen.queryByText(/Order accepted/i)).not.toBeInTheDocument();

    gate.release?.();
    expect(await screen.findByText(/Order accepted/i)).toBeInTheDocument();
  });

  it('shows the search input only when opened, and filters the list', async () => {
    const user = userEvent.setup();
    queueHandlers([
      confirmedOrder,
      { ...confirmedOrder, _id: 'ord_2', publicOrderId: 'SW-2002', customerName: 'Bala Iyer' },
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

  it('an empty queue while online shows the illustration and online copy', async () => {
    queueHandlers([]);
    renderPage();

    expect(await screen.findByText('You are online')).toBeInTheDocument();
    expect(screen.getByText('Waiting for new orders')).toBeInTheDocument();
  });

  it('an empty queue while offline offers "Turn on Online" from the empty state', async () => {
    const user = userEvent.setup();
    let wentOnline = false;
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({ data: { _id: 'r1', name: 'Test Kitchen', availability: 'closed_today' } }),
      ),
      http.get(`${API_BASE}/orders`, () => HttpResponse.json({ data: [] })),
      http.put(`${API_BASE}/restaurant/availability`, () => {
        wentOnline = true;
        return HttpResponse.json({ success: true });
      }),
    );
    renderPage();

    const button = await screen.findByRole('button', { name: /Turn on Online/i });
    await user.click(button);
    await waitFor(() => expect(wentOnline).toBe(true));
  });

  it('a queue error shows the error state and Retry, never the friendly empty state', async () => {
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({ data: { _id: 'r1', name: 'Test Kitchen', availability: 'open' } }),
      ),
      http.get(`${API_BASE}/orders`, () => HttpResponse.json({ message: 'Queue down' }, { status: 500 })),
    );
    renderPage();

    // The query retries once before surfacing the error, so allow for backoff.
    const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(alert).toHaveTextContent(/Queue down/);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    // …and the friendly empty state does NOT, so an outage is never disguised.
    expect(screen.queryByText('You are online')).not.toBeInTheDocument();
    expect(screen.queryByText('Waiting for new orders')).not.toBeInTheDocument();
  });
});
