import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { DISMISSED_CARDS_KEY } from '@/features/orders/infoCards';
import { InfoCarousel } from '@/features/orders/InfoCarousel';

function renderCarousel() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <InfoCarousel />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Serve the three real sources the carousel reads. */
function serveSources({
  alerts = [],
  settlement = {},
  profile = {},
}: {
  alerts?: unknown[];
  settlement?: Record<string, unknown>;
  profile?: Record<string, unknown>;
} = {}) {
  server.use(
    http.get(`${API_BASE}/alerts`, () => HttpResponse.json({ data: alerts })),
    http.get(`${API_BASE}/settlements/summary`, () => HttpResponse.json({ data: settlement })),
    http.get(`${API_BASE}/profile`, () => HttpResponse.json({ data: profile })),
  );
}

describe('InfoCarousel', () => {
  it('renders nothing (no gap, no dots) when no source returns a card', async () => {
    serveSources();
    renderCarousel();
    // Give the queries a tick to settle, then assert the section never appears.
    await waitFor(() => expect(screen.queryByLabelText('Updates')).toBeNull());
    expect(screen.queryAllByTestId('carousel-dot')).toHaveLength(0);
  });

  it('renders a card per real alert with a dots indicator matching the count', async () => {
    serveSources({ alerts: [{ type: 'out_of_stock' }, { type: 'low_stock' }] });
    renderCarousel();

    expect(await screen.findByText('1 item out of stock')).toBeInTheDocument();
    expect(screen.getByText('1 item running low')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByTestId('carousel-dot')).toHaveLength(2));
  });

  it('shows a single settlement card with no dots row', async () => {
    serveSources({ settlement: { availableForWithdrawal: 900 } });
    renderCarousel();

    expect(await screen.findByText(/available to withdraw/)).toBeInTheDocument();
    expect(screen.queryAllByTestId('carousel-dot')).toHaveLength(0);
  });

  it('dismisses a card and persists it under the new key', async () => {
    const user = userEvent.setup();
    serveSources({ alerts: [{ type: 'low_stock' }, { type: 'out_of_stock' }] });
    renderCarousel();

    await screen.findByText('1 item running low');
    await user.click(screen.getByRole('button', { name: /Dismiss: 1 item running low/ }));

    // The card fades out (Step 11) before it leaves the DOM.
    await waitFor(() => expect(screen.queryByText('1 item running low')).toBeNull());
    expect(screen.getByText('1 item out of stock')).toBeInTheDocument();
    const parsed = JSON.parse(String(window.localStorage.getItem(DISMISSED_CARDS_KEY)));
    expect(Object.keys(parsed)).toEqual(['alert:low_stock']);
  });

  it('does not break when the alerts call fails', async () => {
    server.use(
      http.get(`${API_BASE}/alerts`, () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
      http.get(`${API_BASE}/settlements/summary`, () => HttpResponse.json({ data: {} })),
      http.get(`${API_BASE}/profile`, () => HttpResponse.json({ data: {} })),
    );
    renderCarousel();
    await waitFor(() => expect(screen.queryByLabelText('Updates')).toBeNull());
  });
});
