import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { TopBar } from './TopBar';

function renderBar() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TopBar', () => {
  it('shows the outlet status from GET /restaurant', async () => {
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({ data: { name: 'Spice Route', availability: 'open' } }),
      ),
    );
    renderBar();
    expect(await screen.findByRole('button', { name: /outlet status: open/i })).toBeInTheDocument();
  });

  it('PUTs /restaurant/availability with the chosen status', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({ data: { name: 'Spice Route', availability: 'open' } }),
      ),
      http.put(`${API_BASE}/restaurant/availability`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ data: { availability: 'temporarily_closed' } });
      }),
    );
    renderBar();
    await user.click(await screen.findByRole('button', { name: /outlet status: open/i }));
    await user.click(await screen.findByText('Temporarily closed'));
    await waitFor(() => expect(bodies[0]).toEqual({ status: 'temporarily_closed' }));
  });

  it('links the bell to notifications', async () => {
    server.use(
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ data: { name: 'X' } })),
    );
    renderBar();
    expect(screen.getByRole('link', { name: /notifications/i })).toHaveAttribute(
      'href',
      '/notifications',
    );
  });
});
