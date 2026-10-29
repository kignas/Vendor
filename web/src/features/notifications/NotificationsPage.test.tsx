import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { NOTIFICATIONS_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { NotificationsPage } from './NotificationsPage';

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <NotificationsPage />
    </QueryClientProvider>,
  );
}

describe('NotificationsPage', () => {
  it('renders notifications and marks only unread rows as unread', async () => {
    server.use(
      http.get(`${NOTIFICATIONS_BASE}`, () =>
        HttpResponse.json({
          data: [
            { _id: 'n1', title: 'New order', body: 'Waiting for acceptance' },
            { _id: 'n2', title: 'Settled', body: '₹3,100 settled', readAt: '2026-10-27T00:00:00Z' },
          ],
        }),
      ),
    );
    renderPage();
    expect(await screen.findByText('New order')).toBeInTheDocument();
    // The unread row exposes a "mark as read" label; the read row does not.
    expect(screen.getByRole('button', { name: /mark .*new order.* as read/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark .*settled.* as read/i })).toBeNull();
  });

  it('PATCHes /notifications/:id/read when an unread row is tapped', async () => {
    const user = userEvent.setup();
    const patched: string[] = [];
    server.use(
      http.get(`${NOTIFICATIONS_BASE}`, () =>
        HttpResponse.json({ data: [{ _id: 'n1', title: 'New order' }] }),
      ),
      http.patch(`${NOTIFICATIONS_BASE}/:id/read`, ({ params }) => {
        patched.push(String(params.id));
        return HttpResponse.json({ success: true });
      }),
    );
    renderPage();
    await user.click(await screen.findByRole('button', { name: /mark .*new order.* as read/i }));
    expect(patched).toContain('n1');
  });

  it('shows the empty state when there are no notifications', async () => {
    server.use(http.get(`${NOTIFICATIONS_BASE}`, () => HttpResponse.json({ data: [] })));
    renderPage();
    expect(await screen.findByText('No notifications')).toBeInTheDocument();
  });
});
