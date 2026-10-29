import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { InventoryPage } from './InventoryPage';

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <InventoryPage />
    </QueryClientProvider>,
  );
}

const menu = [
  { _id: 'm1', name: 'Masala Dosa', category: 'Breakfast', price: 130, inStock: true },
  { _id: 'm2', name: 'Butter Chicken', category: 'Mains', price: 420, inStock: false },
];

describe('InventoryPage', () => {
  it('shows in/out-of-stock KPIs and the item rows', async () => {
    server.use(http.get(`${API_BASE}/menu`, () => HttpResponse.json({ data: menu })));
    renderPage();
    expect(await screen.findByText('Masala Dosa')).toBeInTheDocument();
    // "In stock" appears as both a KPI label and a row pill.
    expect(screen.getAllByText('In stock').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Out of stock').length).toBeGreaterThan(0);
  });

  it('sends the bulk availability payload with itemIds and inStock', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.use(
      http.get(`${API_BASE}/menu`, () => HttpResponse.json({ data: menu })),
      http.put(`${API_BASE}/menu/availability/bulk`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ data: { modifiedCount: 2 } });
      }),
    );
    renderPage();
    await screen.findByText('Masala Dosa');
    await user.click(screen.getByRole('button', { name: /select all/i }));
    await user.click(screen.getByRole('button', { name: /mark available/i }));
    expect(bodies[0]).toEqual({ itemIds: ['m1', 'm2'], inStock: true });
  });

  it('opens the inventory sheet and PUTs only the supported inventory fields', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.use(
      http.get(`${API_BASE}/menu`, () => HttpResponse.json({ data: menu })),
      http.get(`${API_BASE}/menu/inventory/history`, () => HttpResponse.json({ data: [] })),
      http.put(`${API_BASE}/menu/m1/inventory`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ data: { ...menu[0], trackStock: true, stockQuantity: 12 } });
      }),
    );
    renderPage();
    await user.click(await screen.findByText('Masala Dosa'));
    await user.click(screen.getByLabelText('Track stock quantity'));
    const qty = screen.getByLabelText('Units available');
    await user.clear(qty);
    await user.type(qty, '12');
    await user.click(screen.getByRole('button', { name: /save stock/i }));
    expect(bodies[0]).toMatchObject({ trackStock: true, manualAvailability: true, stockQuantity: 12 });
  });

  it('toggles a single item through PUT /menu/:id/toggle-stock', async () => {
    const user = userEvent.setup();
    const toggled: unknown[] = [];
    server.use(
      http.get(`${API_BASE}/menu`, () => HttpResponse.json({ data: menu })),
      http.put(`${API_BASE}/menu/m1/toggle-stock`, async ({ request }) => {
        toggled.push(await request.json());
        return HttpResponse.json({ data: { ...menu[0], inStock: false } });
      }),
    );
    renderPage();
    await screen.findByText('Masala Dosa');
    await user.click(screen.getByRole('switch', { name: 'Masala Dosa availability' }));
    expect(toggled[0]).toEqual({ inStock: false });
  });
});
