import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { SupportPage } from './SupportPage';

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SupportPage />
    </QueryClientProvider>,
  );
}

describe('SupportPage', () => {
  it('lists tickets from the server with their status', async () => {
    server.use(
      http.get(`${API_BASE}/support`, () =>
        HttpResponse.json({
          data: [
            { _id: 'tk1', subject: 'Payout missing', category: 'settlements', status: 'open' },
            { _id: 'tk2', subject: 'Image upload', category: 'menu', status: 'resolved' },
          ],
        }),
      ),
    );
    renderPage();
    expect(await screen.findByText('Payout missing')).toBeInTheDocument();
    expect(screen.getByText('Image upload')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('shows the empty state when there are no tickets', async () => {
    server.use(http.get(`${API_BASE}/support`, () => HttpResponse.json({ data: [] })));
    renderPage();
    expect(await screen.findByText('No support tickets')).toBeInTheDocument();
  });

  it('submits a new ticket via POST /support', async () => {
    const user = userEvent.setup();
    const posted: unknown[] = [];
    server.use(
      http.get(`${API_BASE}/support`, () => HttpResponse.json({ data: [] })),
      http.post(`${API_BASE}/support`, async ({ request }) => {
        posted.push(await request.json());
        return HttpResponse.json({ success: true });
      }),
    );
    renderPage();
    await user.click(await screen.findByRole('button', { name: /create a ticket/i }));
    await user.type(screen.getByLabelText('Subject'), 'Order issue');
    await user.type(screen.getByLabelText('Description'), 'Food arrived cold');
    await user.click(screen.getByRole('button', { name: /submit ticket/i }));
    expect(posted[0]).toMatchObject({ subject: 'Order issue', message: 'Food arrived cold' });
  });

  it('shows an error state with retry when tickets fail to load', async () => {
    server.use(
      http.get(`${API_BASE}/support`, () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
    );
    renderPage();
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      /Could not load tickets/i,
    );
  });
});
