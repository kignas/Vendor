import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { MenuPage } from './MenuPage';

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MenuPage />
    </QueryClientProvider>,
  );
}

const menu = [
  { _id: 'm1', name: 'Masala Dosa', category: 'Breakfast', price: 130, inStock: true },
  { _id: 'm2', name: 'Butter Chicken', category: 'Mains', price: 420, inStock: false },
  {
    _id: 'm3',
    name: 'Filter Coffee',
    category: 'Beverages',
    price: 60,
    inStock: true,
    trackStock: true,
    stockQuantity: 3,
    lowStockThreshold: 5,
  },
  {
    _id: 'm4',
    name: 'New Thali',
    category: 'Mains',
    price: 250,
    inStock: false,
    approvalStatus: 'pending',
  },
];

describe('MenuPage', () => {
  it('lists items with stock states and a low-stock indicator', async () => {
    server.use(http.get(`${API_BASE}/menu`, () => HttpResponse.json({ data: menu })));
    renderPage();
    expect(await screen.findByText('Masala Dosa')).toBeInTheDocument();
    expect(screen.getByText('Low · 3 left')).toBeInTheDocument();
    expect(screen.getByText('Pending approval')).toBeInTheDocument();
  });

  it('filters by category', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${API_BASE}/menu`, () => HttpResponse.json({ data: menu })));
    renderPage();
    await screen.findByText('Masala Dosa');
    await user.click(screen.getByRole('tab', { name: 'Beverages' }));
    expect(screen.getByText('Filter Coffee')).toBeInTheDocument();
    expect(screen.queryByText('Masala Dosa')).not.toBeInTheDocument();
  });

  it('creates an item with only the supported POST /menu fields', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.use(
      http.get(`${API_BASE}/menu`, () => HttpResponse.json({ data: menu })),
      http.post(`${API_BASE}/menu`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ data: { _id: 'm9' } });
      }),
    );
    renderPage();
    await screen.findByText('Masala Dosa');

    await user.click(screen.getByRole('button', { name: /add item/i }));
    await user.type(screen.getByLabelText(/item name/i), 'Paneer Tikka');
    await user.type(screen.getByLabelText(/price/i), '280');
    await user.type(screen.getByLabelText(/category/i), 'Starters');
    await user.click(screen.getByRole('button', { name: /submit for approval/i }));

    expect(bodies[0]).toEqual({
      name: 'Paneer Tikka',
      price: 280,
      category: 'Starters',
      isVeg: false,
    });
  });

  it('blocks submission and shows a validation error when the name is empty', async () => {
    const user = userEvent.setup();
    let posted = false;
    server.use(
      http.get(`${API_BASE}/menu`, () => HttpResponse.json({ data: menu })),
      http.post(`${API_BASE}/menu`, () => {
        posted = true;
        return HttpResponse.json({ data: { _id: 'm9' } });
      }),
    );
    renderPage();
    await screen.findByText('Masala Dosa');
    await user.click(screen.getByRole('button', { name: /add item/i }));
    await user.type(screen.getByLabelText(/price/i), '100');
    await user.click(screen.getByRole('button', { name: /submit for approval/i }));

    expect(await screen.findByText('Item name is required.')).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it('toggles stock through the mounted route', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    server.use(
      http.get(`${API_BASE}/menu`, () => HttpResponse.json({ data: menu })),
      http.put(`${API_BASE}/menu/m1/toggle-stock`, ({ request }) => {
        calls.push(new URL(request.url).pathname);
        return HttpResponse.json({ data: { ...menu[0], inStock: false } });
      }),
    );
    renderPage();
    await screen.findByText('Masala Dosa');
    await user.click(screen.getByRole('switch', { name: /Masala Dosa/i }));
    expect(calls[0]).toBe('/api/vendor/menu/m1/toggle-stock');
  });
});
