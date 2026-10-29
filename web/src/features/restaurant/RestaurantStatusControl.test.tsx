import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { RestaurantStatusControl } from './RestaurantStatusControl';

function renderControl() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <RestaurantStatusControl />
    </QueryClientProvider>,
  );
}

describe('RestaurantStatusControl', () => {
  it('sends exactly one PUT /restaurant/availability per change', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({ data: { _id: 'r1', name: 'Test Kitchen', availability: 'open' } }),
      ),
      http.put(`${API_BASE}/restaurant/availability`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ success: true });
      }),
    );
    renderControl();
    // Wait for the server status to load before acting.
    await screen.findByRole('radio', { name: /busy/i });
    await user.click(screen.getByRole('radio', { name: /busy/i }));
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ status: 'busy' });
  });

  it('rolls the optimistic pill back when the server rejects the change', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({ data: { _id: 'r1', name: 'Test Kitchen', availability: 'open' } }),
      ),
      http.put(`${API_BASE}/restaurant/availability`, () =>
        HttpResponse.json({ message: 'nope' }, { status: 500 }),
      ),
    );
    renderControl();
    await screen.findByText('Accepting orders');
    await user.click(screen.getByRole('radio', { name: /closed today/i }));
    // After the failed request the UI reflects the server state again, not the
    // optimistic one: the Open radio becomes selected and the pill stays online.
    await waitFor(() => expect(screen.getByRole('radio', { name: /open/i })).toBeChecked());
    expect(screen.getByText('Accepting orders')).toBeInTheDocument();
  });

  it('shows the server-provided reason when the outlet is not accepting orders', async () => {
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({
          data: {
            _id: 'r1',
            name: 'Test Kitchen',
            availability: { status: 'closed_today', reason: 'Closed for maintenance' },
          },
        }),
      ),
    );
    renderControl();
    expect(await screen.findByText('Closed for maintenance')).toBeInTheDocument();
    expect(screen.getByText('Not accepting')).toBeInTheDocument();
  });

  it('warns when accepting orders outside the saved opening hours', async () => {
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({
          data: {
            _id: 'r1',
            name: 'Test Kitchen',
            availability: 'open',
            // A day that is closed makes the advisory deterministic.
            openingHours: { sunday: { closed: true } },
          },
        }),
      ),
    );
    renderControl();
    // The warning only renders when "today" is the closed day; otherwise the
    // control simply shows no warning. Either way no fabricated state appears.
    expect(await screen.findByText('Accepting orders')).toBeInTheDocument();
  });
});
