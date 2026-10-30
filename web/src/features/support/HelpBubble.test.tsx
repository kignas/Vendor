import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelpBubble } from './HelpBubble';
import { pushOverlay, resetOverlays } from '@/app/overlayStack';

function renderBubble() {
  return render(
    <MemoryRouter>
      <HelpBubble />
    </MemoryRouter>,
  );
}

afterEach(() => {
  resetOverlays();
  vi.unstubAllEnvs();
});

describe('HelpBubble', () => {
  it('opens a help sheet with support and notifications, and no call item without a number', async () => {
    vi.stubEnv('VITE_SUPPORT_PHONE', '');
    const user = userEvent.setup();
    renderBubble();

    await user.click(screen.getByRole('button', { name: /help and support/i }));

    expect(await screen.findByRole('dialog', { name: /need help/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /support tickets/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    // No support number is configured, so no dial action is invented.
    expect(screen.queryByRole('link', { name: /call support/i })).not.toBeInTheDocument();
  });

  it('shows the call item only when a real number is configured', async () => {
    vi.stubEnv('VITE_SUPPORT_PHONE', '+91 98765 43210');
    const user = userEvent.setup();
    renderBubble();

    await user.click(screen.getByRole('button', { name: /help and support/i }));

    const call = await screen.findByRole('link', { name: /call support/i });
    expect(call).toHaveAttribute('href', 'tel:+919876543210');
  });

  it('hides the bubble while another sheet is open', () => {
    renderBubble();
    expect(screen.getByRole('button', { name: /help and support/i })).toBeInTheDocument();

    let unregister = () => undefined as void;
    act(() => {
      unregister = pushOverlay(() => undefined);
    });
    expect(screen.queryByRole('button', { name: /help and support/i })).not.toBeInTheDocument();

    act(() => unregister());
    expect(screen.getByRole('button', { name: /help and support/i })).toBeInTheDocument();
  });
});
