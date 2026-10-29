import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { ProfilePage } from './ProfilePage';

function renderPage() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <ProfilePage />
    </QueryClientProvider>,
  );
}

describe('ProfilePage', () => {
  it('renders profile fields from GET /profile and marks admin rows', async () => {
    server.use(
      http.get(`${API_BASE}/profile`, () =>
        HttpResponse.json({
          data: {
            name: 'Spice Route Kitchen',
            businessType: 'restaurant',
            cuisine: ['South Indian', 'Chinese'],
            phone: '9000000000',
            commissionRate: 15,
            settlementSchedule: 'weekly',
            fssaiVerificationStatus: 'verified',
          },
        }),
      ),
      http.get(`${API_BASE}/policies`, () => HttpResponse.json({ data: { privacyPolicy: '2026-01' } })),
    );
    renderPage();
    expect(await screen.findByText('Spice Route Kitchen')).toBeInTheDocument();
    expect(screen.getByText('South Indian, Chinese')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
    // Commission is flagged admin-managed on the same row label.
    expect(screen.getByText(/Commission rate · admin-managed/i)).toBeInTheDocument();
  });

  it('falls back to GET /restaurant when /profile fails', async () => {
    server.use(
      http.get(`${API_BASE}/profile`, () => HttpResponse.json({ message: 'nope' }, { status: 404 })),
      http.get(`${API_BASE}/restaurant`, () =>
        HttpResponse.json({ data: { name: 'Fallback Kitchen' } }),
      ),
      http.get(`${API_BASE}/policies`, () => HttpResponse.json({ data: {} })),
    );
    renderPage();
    expect(await screen.findByText('Fallback Kitchen')).toBeInTheDocument();
  });

  it('PUTs only the vendor allow-list when saving the profile', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.use(
      http.get(`${API_BASE}/profile`, () => HttpResponse.json({ data: { name: 'Old Name' } })),
      http.get(`${API_BASE}/policies`, () => HttpResponse.json({ data: {} })),
      http.put(`${API_BASE}/restaurant/profile`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ data: { name: 'New Name' } });
      }),
    );
    renderPage();
    await user.click(await screen.findByRole('button', { name: /edit/i }));
    const nameInput = screen.getByLabelText('Restaurant name *');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');
    await user.click(screen.getByRole('button', { name: /save profile/i }));
    expect(bodies[0]).toMatchObject({ name: 'New Name' });
    // No admin-managed field leaks into the payload.
    expect(bodies[0]).not.toHaveProperty('commissionRate');
    expect(bodies[0]).not.toHaveProperty('settlementSchedule');
  });
});
