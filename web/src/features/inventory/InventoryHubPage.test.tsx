import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { InventoryHubPage } from './InventoryHubPage';

function renderHub(initialEntry = '/inventory') {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <InventoryHubPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const menu = [
  { _id: 'm1', name: 'Masala Dosa', category: 'Breakfast', price: 130, inStock: true },
];

describe('InventoryHubPage', () => {
  it('defaults to the Menu segment and renders the existing MenuPage body', async () => {
    server.use(http.get(`${API_BASE}/menu`, () => HttpResponse.json({ data: menu })));
    renderHub();

    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-pressed', 'true');
    // MenuPage's own heading proves the existing body is rendered inside the hub.
    expect(await screen.findByRole('heading', { name: /^Menu$/ })).toBeInTheDocument();
  });

  it('switches to the Stock segment and renders the InventoryPage body', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${API_BASE}/menu`, () => HttpResponse.json({ data: menu })));
    renderHub();

    await user.click(screen.getByRole('button', { name: 'Stock' }));
    expect(screen.getByRole('button', { name: 'Stock' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('heading', { name: /^Inventory$/ })).toBeInTheDocument();
  });

  it('honours an explicit ?seg=stock deep link', async () => {
    server.use(http.get(`${API_BASE}/menu`, () => HttpResponse.json({ data: menu })));
    renderHub('/inventory?seg=stock');
    expect(screen.getByRole('button', { name: 'Stock' })).toHaveAttribute('aria-pressed', 'true');
  });
});
