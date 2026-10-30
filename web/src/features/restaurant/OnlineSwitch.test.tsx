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

describe('OnlineSwitch', () => {
  it('asks for confirmation before going offline and sends nothing until accepted', async () => {
    const user = userEvent.setup();
    const bodies = handlers('open');
    renderSwitch();

    const sw = await screen.findByRole('switch', { name: /online/i });
    expect(sw).toHaveAttribute('aria-checked', 'true');

    await user.click(sw);
    expect(await screen.findByText('Stop receiving new orders?')).toBeInTheDocument();
    // No request is sent merely by tapping the switch.
    expect(bodies).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /go offline/i }));
    await waitFor(() => expect(bodies).toEqual([{ status: 'temporarily_closed' }]));
  });

  it('going online needs no confirmation', async () => {
    const user = userEvent.setup();
    const bodies = handlers('temporarily_closed');
    renderSwitch();

    const sw = await screen.findByRole('switch', { name: /offline/i });
    expect(sw).toHaveAttribute('aria-checked', 'false');

    await user.click(sw);
    await waitFor(() => expect(bodies).toEqual([{ status: 'open' }]));
    expect(screen.queryByText('Stop receiving new orders?')).not.toBeInTheDocument();
  });

  it('keeps the switch online when the server rejects the change (another vendor cannot toggle)', async () => {
    const user = userEvent.setup();
    handlers('open', () => HttpResponse.json({ message: 'Forbidden' }, { status: 403 }));
    renderSwitch();

    const sw = await screen.findByRole('switch', { name: /online/i });
    await user.click(sw);
    await user.click(await screen.findByRole('button', { name: /go offline/i }));

    // The optimistic change is rolled back: the server state (open) wins.
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByRole('switch')).toHaveAccessibleName(/online/i);
  });

  it('is single-flight: a double tap on the switch sends one request', async () => {
    const bodies: unknown[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({ data: { _id: 'r1', name: 'Test Kitchen', availability: 'temporarily_closed' } }),
      ),
      http.put(`${API_BASE}/restaurant/availability`, async ({ request }) => {
        bodies.push(await request.json());
        await gate;
        return HttpResponse.json({ success: true });
      }),
    );
    renderSwitch();

    const sw = await screen.findByRole('switch', { name: /offline/i });
    // Going online takes no confirm, so two taps in the same tick both reach the
    // handler; AGENTS.md rule 7 says only one request may leave.
    fireEvent.click(sw);
    fireEvent.click(sw);
    await waitFor(() => expect(bodies.length).toBeGreaterThan(0));
    // Give a second in-flight request a chance to arrive before asserting.
    await new Promise((r) => setTimeout(r, 50));
    expect(bodies).toEqual([{ status: 'open' }]);
    release();
    await waitFor(() => expect(screen.getByRole('switch')).toHaveAccessibleName(/online/i));
  });
});
