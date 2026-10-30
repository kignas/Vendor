import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { InsightsPage } from './InsightsPage';

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <InsightsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const performancePayload = {
  restaurantId: 'r1',
  name: 'Test Kitchen',
  score: 72.5,
  dataConfidence: 0.8,
  isNewRestaurant: false,
  computedAt: '2026-10-30T10:00:00.000Z',
  factors: [
    { key: 'ratings', label: 'Customer ratings', weight: 0.2, normalised: 0.9, raw: 4.6, hasData: true },
    { key: 'preparation', label: 'Preparation time', weight: 0.15, normalised: 0.5, raw: null, hasData: false },
  ],
  sample: { avgRating: 4.6, reviews: 30, completed: 74 },
  availability: { class: 'orderable', orderable: true, reason: '', label: 'Open' },
  ranking: { featured: true, pinned: false, sponsored: false, sponsorLabel: '' },
};

function handlers(overrides: { performance?: unknown } = {}) {
  return [
    http.get(`${API_BASE}/analytics`, () =>
      HttpResponse.json({ success: true, data: { period: '7d', summary: { totalOrders: 5 }, daily: [] } }),
    ),
    http.get(`${API_BASE}/analytics/visits`, () =>
      HttpResponse.json({ success: true, data: { period: '7d', summary: { totalViews: 10, uniqueVisitors: 5 }, daily: [] } }),
    ),
    http.get(`${API_BASE}/performance`, () =>
      HttpResponse.json({ success: true, data: overrides.performance ?? performancePayload }),
    ),
    http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({ success: true, data: { name: 'Test Kitchen' } })),
  ];
}

describe('PerformanceCard (read-only performance & ranking)', () => {
  it('shows the score, factors and availability from the backend', async () => {
    server.use(...handlers());
    renderPage();
    expect(await screen.findByText('Performance & ranking')).toBeInTheDocument();
    expect(screen.getByText('72.5')).toBeInTheDocument();
    expect(screen.getByText('out of 100')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Ranking factors/i }));
    expect(screen.getByText('Customer ratings')).toBeInTheDocument();
    expect(screen.getByText('Preparation time')).toBeInTheDocument();
    // A factor without enough data is labelled, not shown as 0%.
    expect(screen.getByText('Limited data')).toBeInTheDocument();
  });

  it('states that views alone do not determine ranking', async () => {
    server.use(...handlers());
    renderPage();
    expect(await screen.findByText(/Views alone do not determine ranking/i)).toBeInTheDocument();
  });

  it('flags a new restaurant with limited data', async () => {
    server.use(...handlers({ performance: { ...performancePayload, isNewRestaurant: true } }));
    renderPage();
    expect(await screen.findByText(/New restaurant, limited data/i)).toBeInTheDocument();
  });

  it('shows a sponsored badge only when the backend says so', async () => {
    server.use(
      ...handlers({
        performance: { ...performancePayload, ranking: { sponsored: true, sponsorLabel: 'Sponsored' } },
      }),
    );
    renderPage();
    expect(await screen.findByText('Sponsored')).toBeInTheDocument();
  });

  it('distinguishes an administrative offline reason from a temporary one', async () => {
    server.use(
      ...handlers({
        performance: {
          ...performancePayload,
          availability: { class: 'suspended', orderable: false, reason: 'approval_suspended', label: 'Suspended by Eatswada' },
        },
      }),
    );
    renderPage();
    expect(await screen.findByText('Suspended by Eatswada')).toBeInTheDocument();
    expect(screen.getByText(/Set by Eatswada/i)).toBeInTheDocument();
  });

  it('labels a temporary offline reason as temporary', async () => {
    server.use(
      ...handlers({
        performance: {
          ...performancePayload,
          availability: { class: 'temporarily_closed', orderable: false, reason: 'manual_closed', label: 'Temporarily closed' },
        },
      }),
    );
    renderPage();
    expect(await screen.findByText('Temporarily closed')).toBeInTheDocument();
    expect(screen.getByText(/Temporary/i)).toBeInTheDocument();
  });

  it('is strictly read-only: no editable control for weights, pins or scores', async () => {
    server.use(...handlers());
    const { container } = renderPage();
    await screen.findByText('Performance & ranking');
    // No input/select/textarea anywhere in the performance card.
    expect(container.querySelectorAll('input, select, textarea')).toHaveLength(0);
  });

  it('handles a 403 without crashing the page', async () => {
    server.use(
      http.get(`${API_BASE}/performance`, () =>
        HttpResponse.json({ success: false, message: 'Forbidden' }, { status: 403 }),
      ),
      ...handlers(),
    );
    renderPage();
    expect(await screen.findByText(/Could not load your performance score/i)).toBeInTheDocument();
  });
});
