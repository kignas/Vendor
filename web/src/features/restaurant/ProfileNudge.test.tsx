import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { ProfileNudge } from './ProfileNudge';

function renderNudge() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <ProfileNudge />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Only GET /vendor/profile is stubbed; /restaurant falls back to a 404. */
function profileHandler(body: Record<string, unknown>, status = 200) {
  server.use(
    http.get(`${API_BASE}/profile`, () => HttpResponse.json(body, { status })),
    http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({}, { status: 404 })),
  );
}

afterEach(() => {
  window.sessionStorage.clear();
});

describe('ProfileNudge', () => {
  it('shows the nudge when email is genuinely missing', async () => {
    profileHandler({ data: { name: 'Test Kitchen', email: '' } });
    renderNudge();

    expect(await screen.findByText('Missing email address')).toBeInTheDocument();
    expect(screen.getByText("Don't miss important updates")).toBeInTheDocument();
    const action = screen.getByRole('link', { name: /add now/i });
    expect(action).toHaveAttribute('href', '/profile');
  });

  it('shows nothing when email is filled in', async () => {
    profileHandler({ data: { name: 'Test Kitchen', email: 'kitchen@example.com' } });
    renderNudge();

    // Give the query a chance to resolve, then assert the bar never appeared.
    await waitFor(() => expect(screen.queryByText('Missing email address')).not.toBeInTheDocument());
  });

  it('shows nothing while the profile is still loading', () => {
    server.use(http.get(`${API_BASE}/profile`, () => new Promise<never>(() => {})));
    renderNudge();
    expect(screen.queryByText('Missing email address')).not.toBeInTheDocument();
  });

  it('shows nothing when the profile request fails', async () => {
    server.use(
      http.get(`${API_BASE}/profile`, () => HttpResponse.json({}, { status: 500 })),
      http.get(`${API_BASE}/restaurant`, () => HttpResponse.json({}, { status: 500 })),
    );
    renderNudge();

    await waitFor(() => expect(screen.queryByText('Missing email address')).not.toBeInTheDocument());
  });

  it('dismisses for the session and stays dismissed on remount', async () => {
    profileHandler({ data: { email: '' } });
    const user = userEvent.setup();
    const first = renderNudge();

    await screen.findByText('Missing email address');
    await user.click(screen.getByRole('button', { name: /dismiss profile reminder/i }));
    expect(screen.queryByText('Missing email address')).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem('eatswada_vendor_profile_nudge_dismissed')).toBe('1');

    first.unmount();
    renderNudge();
    expect(screen.queryByText('Missing email address')).not.toBeInTheDocument();
  });
});
