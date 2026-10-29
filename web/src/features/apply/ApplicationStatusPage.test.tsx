import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_ORIGIN } from '@/lib/api';
import { ApplicationStatusPage } from './ApplicationStatusPage';

const BASE = `${API_ORIGIN}/api/vendor-applications`;

function renderPage() {
  return render(
    <MemoryRouter>
      <ApplicationStatusPage />
    </MemoryRouter>,
  );
}

describe('ApplicationStatusPage', () => {
  it('requires both fields before querying', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /check status/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Application ID and status token are required/i,
    );
  });

  it('renders the server status, restaurant name and change request', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${BASE}/APP-9/status`, ({ request }) => {
        const token = new URL(request.url).searchParams.get('statusToken');
        expect(token).toBe('tok-xyz');
        return HttpResponse.json({
          success: true,
          data: {
            status: 'needs_changes',
            restaurantName: 'Spice Route',
            changeRequest: 'Please re-upload a clearer FSSAI image.',
          },
        });
      }),
    );
    renderPage();
    await user.type(screen.getByLabelText('Application ID'), 'APP-9');
    await user.type(screen.getByLabelText('Status token'), 'tok-xyz');
    await user.click(screen.getByRole('button', { name: /check status/i }));
    expect(await screen.findByText('CHANGES REQUESTED')).toBeInTheDocument();
    expect(screen.getByText('Spice Route')).toBeInTheDocument();
    expect(screen.getByText(/clearer FSSAI image/)).toBeInTheDocument();
  });

  it('surfaces the server message on failure', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${BASE}/BAD/status`, () =>
        HttpResponse.json({ success: false, message: 'Invalid status token.' }, { status: 403 }),
      ),
    );
    renderPage();
    await user.type(screen.getByLabelText('Application ID'), 'BAD');
    await user.type(screen.getByLabelText('Status token'), 'nope');
    await user.click(screen.getByRole('button', { name: /check status/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid status token.');
  });
});
