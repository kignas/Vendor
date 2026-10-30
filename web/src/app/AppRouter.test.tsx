import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { setToken } from '@/lib/auth';
import { AppRouter } from './AppRouter';

/** Drive the hash router straight to a route, then mount the real router. */
function renderAt(route: string) {
  window.location.hash = `#${route}`;
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <AppRouter />
    </QueryClientProvider>,
  );
}

/** Only the endpoints the shell / orders page touch; everything else 404s. */
function baseHandlers() {
  server.use(
    http.get(`${API_BASE}/restaurant`, () =>
      HttpResponse.json({ data: { _id: 'r1', name: 'Test Kitchen', availability: 'open' } }),
    ),
    http.get(`${API_BASE}/orders`, () => HttpResponse.json({ data: [] })),
  );
}

describe('AppRouter navigation', () => {
  beforeEach(() => {
    window.location.hash = '';
    setToken('test-token');
  });

  it('redirects the root route to /orders (Orders is home)', async () => {
    baseHandlers();
    renderAt('/');
    expect(await screen.findByRole('heading', { name: /^Orders$/ })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/orders');
  });

  it('renders the Orders-first primary nav on the orders route', async () => {
    baseHandlers();
    renderAt('/orders');
    await screen.findByRole('heading', { name: /^Orders$/ });
    const nav = screen.getByRole('navigation', { name: /primary/i });
    for (const label of ['Orders', 'Inventory', 'Business', 'Feedback', 'History']) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    // Home is no longer a bottom-nav destination.
    expect(within(nav).queryByText('Home')).not.toBeInTheDocument();
  });

  it('redirects /menu into the Inventory hub (Menu segment)', async () => {
    baseHandlers();
    renderAt('/menu');
    expect(
      await screen.findByRole('group', { name: /inventory view/i }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#/inventory');
  });

  it('redirects /finance into the Business hub with the Finance segment', async () => {
    baseHandlers();
    renderAt('/finance');
    expect(await screen.findByRole('group', { name: /business view/i })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/business?seg=finance');
    expect(await screen.findByRole('button', { name: 'Finance' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('redirects /insights into the Business hub (Insights segment)', async () => {
    baseHandlers();
    renderAt('/insights');
    expect(await screen.findByRole('group', { name: /business view/i })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/business');
  });

  it('renders the History screen with the existing pagination summary', async () => {
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({ data: { _id: 'r1', name: 'Test Kitchen' } }),
      ),
      http.get(`${API_BASE}/orders`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('view') === 'history') {
          return HttpResponse.json({
            data: [
              {
                _id: 'h1',
                publicOrderId: 'SW-9001',
                status: 'delivered',
                createdAt: new Date().toISOString(),
                items: [{ name: 'Idli', quantity: 1, isVeg: true }],
                total: 120,
              },
            ],
            currentPage: 1,
            totalPages: 3,
            totalOrders: 42,
          });
        }
        return HttpResponse.json({ data: [] });
      }),
    );
    renderAt('/history');
    expect(await screen.findByRole('heading', { name: /order history/i })).toBeInTheDocument();
    expect(await screen.findByText(/Showing 1 of 42 orders/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load older orders/i })).toBeInTheDocument();
  });

  it('shows the empty history state when the server has no past orders', async () => {
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({ data: { _id: 'r1', name: 'Test Kitchen' } }),
      ),
      http.get(`${API_BASE}/orders`, () =>
        HttpResponse.json({ data: [], currentPage: 1, totalPages: 1, totalOrders: 0 }),
      ),
    );
    renderAt('/history');
    expect(await screen.findByText(/no past orders/i)).toBeInTheDocument();
  });

  it('sends an unauthenticated visitor to login', async () => {
    window.localStorage.clear();
    renderAt('/orders');
    await waitFor(() => expect(window.location.hash).toBe('#/login'));
  });
});
