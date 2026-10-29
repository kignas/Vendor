import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_ORIGIN } from '@/lib/api';
import { ApplyPage } from './ApplyPage';

const BASE = `${API_ORIGIN}/api/vendor-applications`;

function renderPage() {
  return render(
    <MemoryRouter>
      <ApplyPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // The coordinate fields are readonly and filled only by GPS, matching
  // apply.html; stub a successful fix so the wizard can reach review.
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: {
      getCurrentPosition: (ok: PositionCallback) =>
        ok({ coords: { longitude: 77.5946, latitude: 12.9716, accuracy: 12 } } as GeolocationPosition),
    },
  });
});

afterEach(() => vi.unstubAllGlobals());

/** Drive the wizard to the review step with valid data. */
async function fillToReview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: /restaurant/i }));
  await user.click(screen.getByRole('button', { name: /continue/i }));
  await user.type(screen.getByLabelText('Owner name *'), 'Asha Rao');
  await user.type(screen.getByLabelText('Mobile number *'), '+919876543210');
  await user.type(screen.getByLabelText('Email *'), 'asha@example.com');
  await user.type(screen.getByLabelText('Business name *'), 'Spice Route');
  await user.type(screen.getByLabelText('Password *'), 'longenoughpw');
  await user.click(screen.getByRole('button', { name: /continue/i }));
  await user.type(screen.getByLabelText('Cuisine *'), 'South Indian');
  await user.type(screen.getByLabelText('Business address *'), '12 MG Road, Bengaluru');
  await user.click(screen.getByRole('button', { name: /use my current location/i }));
  await waitFor(() =>
    expect((screen.getByLabelText('Longitude') as HTMLInputElement).value).toBe('77.594600'),
  );
  await user.click(screen.getByRole('button', { name: /continue/i }));
  await user.type(screen.getByLabelText(/FSSAI/), '12345678901234');
  await user.click(screen.getByRole('button', { name: /continue/i }));
  await user.click(screen.getByRole('radio', { name: /self delivery/i }));
  await user.click(screen.getByRole('button', { name: /continue/i }));
  await user.click(screen.getByRole('button', { name: /continue/i }));
  await user.click(screen.getByRole('checkbox', { name: /vendor agreement/i }));
  await user.click(screen.getByRole('checkbox', { name: /accept responsibility/i }));
  await user.click(screen.getByRole('button', { name: /continue/i }));
}

describe('ApplyPage', () => {
  it('blocks step 1 until the owner fields are valid', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('radio', { name: /restaurant/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await user.type(screen.getByLabelText('Owner name *'), 'Asha');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    // Still on owner info: a short password/email keeps us here.
    expect(screen.getByLabelText('Password *')).toBeInTheDocument();
  });

  it('submits the application with the exact backend payload shape', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.use(
      http.post(BASE, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({ success: true, data: { id: 'APP-9', statusToken: 'tok' } });
      }),
    );
    renderPage();
    await fillToReview(user);
    await user.click(screen.getByRole('button', { name: /submit application/i }));
    expect(await screen.findByText('Application submitted')).toBeInTheDocument();
    expect(bodies[0]).toMatchObject({
      ownerName: 'Asha Rao',
      email: 'asha@example.com',
      restaurantName: 'Spice Route',
      deliveryMode: 'self_delivery',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    });
    // The password is sent once, never persisted to the draft.
    expect(JSON.stringify(bodies[0])).toContain('longenoughpw');
    expect(sessionStorage.getItem('eatswada_vendor_application_id')).toBe('APP-9');
  });

  it('shows the server error message when submission fails', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(BASE, () => HttpResponse.json({ success: false, message: 'Email already used' }, { status: 409 })),
    );
    renderPage();
    await fillToReview(user);
    await user.click(screen.getByRole('button', { name: /submit application/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Email already used'));
  });
});
