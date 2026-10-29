import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { SettingsPage } from './SettingsPage';

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <SettingsPage />
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  it('renders admin-managed rows and pre-fills the editable fields', async () => {
    server.use(
      http.get(`${API_BASE}/settings`, () =>
        HttpResponse.json({
          data: {
            deliveryMode: 'eatswada_rider',
            commissionRate: 15,
            maxActiveOrders: 20,
            activeOrders: 3,
            availableSlots: 17,
            settlementSchedule: 'weekly',
          },
        }),
      ),
      http.get(`${API_BASE}/onboarding/config`, () =>
        HttpResponse.json({ data: { maxActiveOrders: { min: 1, max: 500 }, settlementSchedules: ['weekly', 'monthly'] } }),
      ),
    );
    renderPage();
    expect(await screen.findByText('15%')).toBeInTheDocument();
    expect(screen.getByText('3 of 20 · 17 free')).toBeInTheDocument();
    expect((screen.getByLabelText('Maximum active orders') as HTMLInputElement).value).toBe('20');
    expect((screen.getByLabelText('Payout schedule') as HTMLSelectElement).value).toBe('weekly');
  });

  it('saves ONLY maxActiveOrders and settlementSchedule', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.use(
      http.get(`${API_BASE}/settings`, () =>
        HttpResponse.json({ data: { maxActiveOrders: 20, settlementSchedule: 'weekly' } }),
      ),
      http.get(`${API_BASE}/onboarding/config`, () => HttpResponse.json({ data: {} })),
      http.put(`${API_BASE}/settings`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ message: 'Settings saved.' });
      }),
    );
    renderPage();
    const input = await screen.findByLabelText('Maximum active orders');
    await user.clear(input);
    await user.type(input, '25');
    await user.click(screen.getByRole('button', { name: /save settings/i }));
    expect(bodies[0]).toEqual({ maxActiveOrders: 25, settlementSchedule: 'weekly' });
  });

  it('rejects an out-of-range value without calling the server', async () => {
    const user = userEvent.setup();
    let putCount = 0;
    server.use(
      http.get(`${API_BASE}/settings`, () =>
        HttpResponse.json({ data: { maxActiveOrders: 20, settlementSchedule: 'weekly' } }),
      ),
      http.get(`${API_BASE}/onboarding/config`, () => HttpResponse.json({ data: {} })),
      http.put(`${API_BASE}/settings`, () => {
        putCount += 1;
        return HttpResponse.json({ message: 'saved' });
      }),
    );
    renderPage();
    const input = await screen.findByLabelText('Maximum active orders');
    await user.clear(input);
    await user.type(input, '999');
    await user.click(screen.getByRole('button', { name: /save settings/i }));
    expect(putCount).toBe(0);
  });

  it('Kitchen Rush Mode is local-only and never sent to the backend', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.use(
      http.get(`${API_BASE}/settings`, () =>
        HttpResponse.json({ data: { maxActiveOrders: 20, settlementSchedule: 'weekly' } }),
      ),
      http.get(`${API_BASE}/onboarding/config`, () => HttpResponse.json({ data: {} })),
      http.put(`${API_BASE}/settings`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ message: 'Settings saved.' });
      }),
    );
    renderPage();
    await user.click(await screen.findByRole('switch', { name: /kitchen rush mode/i }));
    expect(window.localStorage.getItem('eatswada_vendor_rush_mode')).toBe('1');
    await user.click(screen.getByRole('button', { name: /save settings/i }));
    // The rush flag must not appear in the PUT body.
    expect(JSON.stringify(bodies[0])).not.toContain('rush');
  });
});
