import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { ReviewsPage } from './ReviewsPage';

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <ReviewsPage />
    </QueryClientProvider>,
  );
}

const reviews = [
  { _id: 'r1', score: 5, comment: 'Excellent dosa', user: { name: 'Asha', orderCount: 4 } },
  { _id: 'r2', score: 2, comment: 'Cold food', user: { name: 'Rahul' } },
];

describe('ReviewsPage', () => {
  it('renders the server summary and review cards', async () => {
    server.use(
      http.get(`${API_BASE}/reviews`, () =>
        HttpResponse.json({
          data: reviews,
          summary: { rating: 4.2, ratingCount: 10, reviewCount: 6 },
        }),
      ),
    );
    renderPage();

    expect(await screen.findByText('Asha')).toBeInTheDocument();
    expect(screen.getByText('Excellent dosa')).toBeInTheDocument();
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText('10 ratings')).toBeInTheDocument();
  });

  it('shows the real empty state when there are no reviews', async () => {
    server.use(
      http.get(`${API_BASE}/reviews`, () => HttpResponse.json({ data: [], summary: {} })),
    );
    renderPage();
    expect(await screen.findByText(/No customer reviews yet/i)).toBeInTheDocument();
  });

  it('filters to unreplied reviews', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_BASE}/reviews`, () =>
        HttpResponse.json({
          data: [{ ...reviews[0], vendorReply: { message: 'Thanks!' } }, reviews[1]],
          summary: { rating: 3.5 },
        }),
      ),
    );
    renderPage();

    await screen.findByText('Asha');
    await user.click(screen.getByRole('tab', { name: 'Unreplied' }));

    expect(screen.queryByText('Asha')).not.toBeInTheDocument();
    expect(screen.getByText('Rahul')).toBeInTheDocument();
  });

  it('posts a reply and refetches', async () => {
    const user = userEvent.setup();
    let replied = false;
    server.use(
      http.get(`${API_BASE}/reviews`, () =>
        HttpResponse.json({
          data: replied ? [{ ...reviews[1], vendorReply: { message: 'Sorry about that' } }] : [reviews[1]],
          summary: { rating: 2 },
        }),
      ),
      http.post(`${API_BASE}/reviews/r2/reply`, async ({ request }) => {
        const body = (await request.json()) as { message: string };
        expect(body.message).toBe('Sorry about that');
        replied = true;
        return HttpResponse.json({ success: true });
      }),
    );
    renderPage();

    await user.click(await screen.findByText('Rahul'));
    const sheet = await screen.findByRole('dialog', { name: /Review/i });
    await user.type(within(sheet).getByLabelText(/Reply to/i), 'Sorry about that');
    await user.click(within(sheet).getByRole('button', { name: /Post reply/i }));

    await waitFor(() => expect(replied).toBe(true));
    expect(await screen.findByText(/Sorry about that/)).toBeInTheDocument();
  });

  it('loads the next page and requests the correct page number', async () => {
    const user = userEvent.setup();
    const pages: string[] = [];
    server.use(
      http.get(`${API_BASE}/reviews`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') || '1';
        pages.push(page);
        if (page === '1') {
          return HttpResponse.json({
            data: [reviews[0]],
            summary: { rating: 4 },
            currentPage: 1,
            totalPages: 2,
            total: 21,
          });
        }
        return HttpResponse.json({
          data: [reviews[1]],
          summary: { rating: 4 },
          currentPage: 2,
          totalPages: 2,
          total: 21,
        });
      }),
    );
    renderPage();

    await screen.findByText('Asha');
    await user.click(screen.getByRole('button', { name: /load more reviews/i }));
    expect(await screen.findByText('Rahul')).toBeInTheDocument();
    expect(pages).toContain('2');
  });

  it('filters by the last-7-days window', async () => {
    const user = userEvent.setup();
    const recent = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const old = new Date(Date.now() - 20 * 86_400_000).toISOString();
    server.use(
      http.get(`${API_BASE}/reviews`, () =>
        HttpResponse.json({
          data: [
            { _id: 'r1', score: 5, comment: 'Fresh', user: { name: 'Asha' }, createdAt: recent },
            { _id: 'r2', score: 4, comment: 'Old but fine', user: { name: 'Rahul' }, createdAt: old },
          ],
          summary: { rating: 4.5 },
        }),
      ),
    );
    renderPage();

    await screen.findByText('Asha');
    await user.click(screen.getByRole('tab', { name: 'Last 7 days' }));
    expect(screen.getByText('Asha')).toBeInTheDocument();
    expect(screen.queryByText('Rahul')).not.toBeInTheDocument();
  });
});
