import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { setToken, getToken } from '@/lib/auth';
import { useUiStore } from './uiStore';
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

/** GET /restaurant with the given availability, plus a recording PUT. */
function handlers(availability: unknown, put?: (body: unknown) => Response) {
  const bodies: unknown[] = [];
  server.use(
    http.get(`${API_BASE}/restaurant`, () =>
      HttpResponse.json({ data: { _id: 'r1', name: 'Spice Route', availability } }),
    ),
    http.put(`${API_BASE}/restaurant/availability`, async ({ request }) => {
      const body = await request.json();
      bodies.push(body);
      return put ? put(body) : HttpResponse.json({ success: true });
    }),
  );
  return bodies;
}

describe('TopBar', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useUiStore.setState({ connection: 'online', unreadCount: 0, searchOpen: false, orderQuery: '' });
  });

  it('shows the availability pill from GET /restaurant (green Online)', async () => {
    handlers('open');
    renderBar();
    const sw = await screen.findByRole('switch', { name: /availability: online/i });
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('shows amber Paused when temporarily closed', async () => {
    handlers('temporarily_closed');
    renderBar();
    expect(await screen.findByRole('switch', { name: /availability: paused/i })).toBeInTheDocument();
  });

  it('shows grey Offline when closed today', async () => {
    handlers('closed_today');
    renderBar();
    expect(await screen.findByRole('switch', { name: /availability: offline/i })).toBeInTheDocument();
  });

  it('opens the status sheet and PUTs /restaurant/availability with the chosen status', async () => {
    const user = userEvent.setup();
    const bodies = handlers('open');
    renderBar();
    await user.click(await screen.findByRole('switch', { name: /availability: online/i }));
    await user.click(await screen.findByText('Temporarily closed'));
    await waitFor(() => expect(bodies[0]).toEqual({ status: 'temporarily_closed' }));
  });

  it('links the bell to notifications and shows the unread badge', async () => {
    handlers('open');
    useUiStore.setState({ unreadCount: 3 });
    renderBar();
    const bell = screen.getByRole('link', { name: /notifications, 3 unread/i });
    expect(bell).toHaveAttribute('href', '/notifications');
  });

  it('opens the order search from the search icon', async () => {
    const user = userEvent.setup();
    handlers('open');
    renderBar();
    await user.click(screen.getByRole('button', { name: /search orders/i }));
    expect(useUiStore.getState().searchOpen).toBe(true);
  });

  it('opens the grid sheet titled with the restaurant name and lists the tools', async () => {
    const user = userEvent.setup();
    handlers('open');
    renderBar();
    await user.click(screen.getByRole('button', { name: /open menu/i }));

    // The restaurant name is the sheet title (also shown, smaller, in the header).
    expect((await screen.findAllByText('Spice Route')).length).toBeGreaterThanOrEqual(2);
    for (const label of [
      'Overview',
      'Restaurant profile',
      'Notifications',
      'Support',
      'Settings',
      'Sign out',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('signs out from the grid sheet, clearing the auth token', async () => {
    const user = userEvent.setup();
    handlers('open');
    setToken('test-token');
    renderBar();
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    await user.click(await screen.findByText('Sign out'));
    await waitFor(() => expect(getToken()).toBeNull());
  });

  it('shows the no-internet bar only while offline', async () => {
    handlers('open');
    useUiStore.setState({ connection: 'offline' });
    renderBar();
    expect(screen.getByText(/no internet connection/i)).toBeInTheDocument();
  });
});
