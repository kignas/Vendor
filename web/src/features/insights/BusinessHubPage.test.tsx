import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { makeQueryClient } from '@/lib/queryClient';
import { BusinessHubPage } from './BusinessHubPage';

function renderHub(initialEntry = '/business') {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <BusinessHubPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BusinessHubPage', () => {
  it('defaults to the Insights segment and renders the existing InsightsPage body', async () => {
    renderHub();
    expect(screen.getByRole('button', { name: 'Insights' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('heading', { name: /^Analytics$/ })).toBeInTheDocument();
  });

  it('switches to Finance and renders the existing FinancePage body', async () => {
    const user = userEvent.setup();
    renderHub();
    await user.click(screen.getByRole('button', { name: 'Finance' }));
    expect(screen.getByRole('button', { name: 'Finance' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('heading', { name: /^Finance$/ })).toBeInTheDocument();
  });

  it('honours an explicit ?seg=finance deep link', () => {
    renderHub('/business?seg=finance');
    expect(screen.getByRole('button', { name: 'Finance' })).toHaveAttribute('aria-pressed', 'true');
  });
});
