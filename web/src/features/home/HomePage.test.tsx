import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { HomePage } from '@/features/home/HomePage';

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HomePage', () => {
  it('renders the dashboard KPIs from the real { success, data } envelope', async () => {
    server.use(
      http.get(`${API_BASE}/dashboard`, () =>
        HttpResponse.json({
          success: true,
          data: {
            today: { orders: 18, sales: 9420, averageOrderValue: 523, cancelled: 1 },
            pendingSettlement: 3150,
            alerts: { menuReview: 1, lowStock: 2, outOfStock: 1 },
            recentActivity: [
              { type: 'menu_submitted', message: 'Submitted Paneer Tikka.', createdAt: new Date().toISOString() },
            ],
          },
        }),
      ),
      http.get(`${API_BASE}/orders`, () => HttpResponse.json({ data: [] })),
    );
    renderPage();

    expect(await screen.findByText('₹9,420')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('₹523')).toBeInTheDocument();
    expect(screen.getByText('₹3,150')).toBeInTheDocument();
    expect(screen.getByText('Submitted Paneer Tikka.')).toBeInTheDocument();
    // Alert summary row names the real counts.
    expect(screen.getByText(/1 out of stock/)).toBeInTheDocument();
    expect(screen.getByText(/2 low on stock/)).toBeInTheDocument();
  });

  it('shows a retry error state when the dashboard fails', async () => {
    server.use(
      http.get(`${API_BASE}/dashboard`, () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
      http.get(`${API_BASE}/orders`, () => HttpResponse.json({ data: [] })),
    );
    renderPage();
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      /Could not load today's overview/i,
    );
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });
});
