import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { OnlineSwitch } from './OnlineSwitch';

function renderSwitch() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <OnlineSwitch />
    </QueryClientProvider>,
  );
}

/** GET /restaurant returning the given availability, plus a recording PUT. */
function handlers(availability: unknown, put?: (body: unknown) => Response) {
  const bodies: unknown[] = [];
  server.use(
    http.get(`${API_BASE}/restaurant`, () =>
      HttpResponse.json({ data: { _id: 'r1', name: 'Test Kitchen', availability } }),
    ),
    http.put(`${API_BASE}/restaurant/availability`, async ({ request }) => {
      const body = await request.json();
      bodies.push(body);
      return put ? put(body) : HttpResponse.json({ success: true });
    }),
  );
  return bodies;
}

describe('OnlineSwitch (header availability pill)', () => {
  it('shows green Online while accepting orders and opens the status sheet on tap', async () => {
    const user = userEvent.setup();
    const bodies = handlers('open');
    renderSwitch();

    const sw = await screen.findByRole('switch', { name: /availability: online/i });
    expect(sw).toHaveAttribute('aria-checked', 'true');

    // Tapping while online opens the shared sheet; nothing is sent yet.
    await user.click(sw);
    expect(await screen.findByText('Outlet status')).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  it('shows amber Paused when temporarily closed and lets the sheet set a new status', async () => {
    const user = userEvent.setup();
    const bodies = handlers('temporarily_closed');
    renderSwitch();

    const sw = await screen.findByRole('switch', { name: /availability: paused/i });
    expect(sw).toHaveAttribute('aria-checked', 'false');

    await user.click(sw);
    await user.click(await screen.findByText('Open'));
    await waitFor(() => expect(bodies).toEqual([{ status: 'open' }]));
  });

  it('shows grey Offline for closed_today and resumes orders directly on tap', async () => {
    const user = userEvent.setup();
    const bodies = handlers('closed_today');
    renderSwitch();

    const sw = await screen.findByRole('switch', { name: /availability: offline/i });
    expect(sw).toHaveAttribute('aria-checked', 'false');

    // The only direct shortcut: tapping Offline resumes through the real PUT.
    await user.click(sw);
    await waitFor(() => expect(bodies).toEqual([{ status: 'open' }]));
    expect(screen.queryByText('Outlet status')).not.toBeInTheDocument();
  });

  it('is single-flight: a double tap from Offline sends one request', async () => {
    const bodies: unknown[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({ data: { _id: 'r1', name: 'Test Kitchen', availability: 'closed_today' } }),
      ),
      http.put(`${API_BASE}/restaurant/availability`, async ({ request }) => {
        bodies.push(await request.json());
        await gate;
        return HttpResponse.json({ success: true });
      }),
    );
    renderSwitch();

    const sw = await screen.findByRole('switch', { name: /availability: offline/i });
    // Both taps land in the same tick; AGENTS.md rule 7 allows only one request.
    fireEvent.click(sw);
    fireEvent.click(sw);
    await waitFor(() => expect(bodies.length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 50));
    expect(bodies).toEqual([{ status: 'open' }]);
    release();
    await waitFor(() =>
      expect(screen.getByRole('switch')).toHaveAccessibleName(/availability: online/i),
    );
  });

  it('rolls back to the server state when the backend rejects the change', async () => {
    const user = userEvent.setup();
    handlers('closed_today', () => HttpResponse.json({ message: 'Forbidden' }, { status: 403 }));
    renderSwitch();

    await user.click(await screen.findByRole('switch', { name: /availability: offline/i }));
    // Server state (closed_today => Offline) wins after the failure.
    await waitFor(() =>
      expect(screen.getByRole('switch')).toHaveAccessibleName(/availability: offline/i),
    );
  });
});
