import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { OrdersEmptyState } from '@/features/orders/OrdersEmptyState';

function renderState(tab?: 'preparing' | 'ready' | 'dispatch') {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        {tab ? <OrdersEmptyState tab={tab} /> : <OrdersEmptyState />}
      </MemoryRouter>
      <Toaster />
    </QueryClientProvider>,
  );
}

/** Serve a restaurant with a given availability, plus a spy on the PUT. */
function availabilityHandlers(availability: string | undefined, put = vi.fn(() => HttpResponse.json({ success: true }))) {
  server.use(
    http.get(`${API_BASE}/restaurant`, () =>
      HttpResponse.json({ data: { _id: 'r1', name: 'Test Kitchen', availability } }),
    ),
    http.put(`${API_BASE}/restaurant/availability`, put),
  );
  return put;
}

describe('OrdersEmptyState', () => {
  it('shows the online copy with no action while accepting orders', async () => {
    availabilityHandlers('open');
    renderState();

    expect(await screen.findByText('You are online')).toBeInTheDocument();
    expect(screen.getByText('Waiting for new orders')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Turn on Online|Resume orders/i })).not.toBeInTheDocument();
  });

  it('offline shows "Turn on Online" and a double tap sends ONE request', async () => {
    const user = userEvent.setup();
    // Hold the PUT open so the in-flight window is real, then tap repeatedly.
    const gate: { release?: () => void } = {};
    const sent: unknown[] = [];
    const put = vi.fn(async ({ request }: { request: Request }) => {
      sent.push(await request.json());
      await new Promise<void>((resolve) => {
        gate.release = resolve;
      });
      return HttpResponse.json({ success: true });
    });
    availabilityHandlers('closed_today', put as never);
    renderState();

    const button = await screen.findByRole('button', { name: /Turn on Online/i });
    await user.click(button);
    await user.click(button);
    await user.click(button);

    expect(put).toHaveBeenCalledTimes(1);
    // The single call carries the real availability payload.
    expect(sent).toEqual([{ status: 'open' }]);

    gate.release?.();
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
  });

  it('paused shows "Resume orders" and a double tap sends ONE request', async () => {
    const user = userEvent.setup();
    const gate: { release?: () => void } = {};
    const put = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        gate.release = resolve;
      });
      return HttpResponse.json({ success: true });
    });
    availabilityHandlers('temporarily_closed', put as never);
    renderState();

    expect(await screen.findByText('Orders are paused')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Resume orders/i });
    await user.click(button);
    await user.click(button);

    expect(put).toHaveBeenCalledTimes(1);
    gate.release?.();
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
  });

  it('busy still accepts: no action and no "paused" claim', async () => {
    availabilityHandlers('busy');
    renderState();

    expect(await screen.findByText('You are busy')).toBeInTheDocument();
    expect(screen.queryByText(/paused/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Turn on Online|Resume orders/i })).not.toBeInTheDocument();
  });

  it('while the availability status is still loading, shows the neutral copy with no claim or action', async () => {
    // A profile request that never resolves keeps the query in its loading
    // state, which is the "unknown" case: no status claim and no action.
    server.use(http.get(`${API_BASE}/restaurant`, () => new Promise<never>(() => undefined)));
    renderState();

    const region = await screen.findByRole('status');
    expect(region).toHaveTextContent('No orders right now');
    expect(region).not.toHaveTextContent(/online|offline|paused|busy/i);
    expect(screen.queryByRole('button', { name: /Turn on Online|Resume orders/i })).not.toBeInTheDocument();
  });

  it('does not show an availability action when the profile request fails', async () => {
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
    );
    renderState();

    // A failed profile query means the status is unknown → neutral, no action.
    expect(await screen.findByText('No orders right now')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Turn on Online|Resume orders/i })).not.toBeInTheDocument();
  });

  it('uses per-tab copy for the Ready list while accepting orders', async () => {
    availabilityHandlers('open');
    renderState('ready');

    expect(await screen.findByText('Nothing ready yet')).toBeInTheDocument();
  });
});
