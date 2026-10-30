import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/server';
import { API_BASE } from '@/lib/api';
import { makeQueryClient } from '@/lib/queryClient';
import { resetOverlays } from '@/app/overlayStack';
import { BottomNav } from '@/app/BottomNav';
import { KpiCard } from '@/components/KpiCard';
import { StatusPill } from '@/components/StatusPill';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ChartCard } from '@/components/ChartCard';
import { BottomSheet } from '@/components/BottomSheet';
import { AppShell } from '@/app/AppShell';

describe('shared components', () => {
  it('KpiCard renders the value, or an em dash for null', () => {
    const { rerender } = render(<KpiCard label="Today" value="₹1,000" />);
    expect(screen.getByText('₹1,000')).toBeInTheDocument();
    rerender(<KpiCard label="Today" value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('KpiCard loading shows a skeleton and no number', () => {
    render(<KpiCard label="Today" value={null} loading />);
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Loading Today')).toBeInTheDocument();
  });

  it('StatusPill renders its label raw', () => {
    render(<StatusPill tone="success">ready_for_pickup</StatusPill>);
    expect(screen.getByText('ready_for_pickup')).toBeInTheDocument();
  });

  it('EmptyState shows title and description', () => {
    render(<EmptyState title="No orders" description="Nothing here yet" />);
    expect(screen.getByText('No orders')).toBeInTheDocument();
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });

  it('ErrorState calls onRetry when the button is clicked', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Boom" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('ErrorState hides Retry when no handler is given', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('ChartCard renders skeleton while loading and empty state when empty', () => {
    const { rerender } = render(
      <ChartCard title="Orders" loading>
        <div>chart</div>
      </ChartCard>,
    );
    expect(screen.getByLabelText('Loading chart')).toBeInTheDocument();
    rerender(
      <ChartCard title="Orders" empty>
        <div>chart</div>
      </ChartCard>,
    );
    expect(screen.queryByText('chart')).not.toBeInTheDocument();
    expect(screen.getByText('No data for this period.')).toBeInTheDocument();
  });

  it('BottomSheet renders its title and body when open, and nothing when closed', () => {
    const { rerender } = render(
      <BottomSheet open={false} onOpenChange={() => undefined} title="Order actions">
        <p>Body</p>
      </BottomSheet>,
    );
    expect(screen.queryByText('Order actions')).not.toBeInTheDocument();

    rerender(
      <BottomSheet open onOpenChange={() => undefined} title="Order actions">
        <p>Body</p>
      </BottomSheet>,
    );
    expect(screen.getByText('Order actions')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('BottomSheet always exposes an accessible title and description', () => {
    render(
      <BottomSheet open onOpenChange={() => undefined}>
        <p>Body</p>
      </BottomSheet>,
    );
    // Falls back to sr-only defaults so Radix never warns and AT always has context.
    expect(screen.getByText('Options')).toBeInTheDocument();
    expect(screen.getByText('Bottom sheet content')).toBeInTheDocument();
  });

  it('an open BottomSheet hides the primary nav so it cannot cover the sheet', async () => {
    resetOverlays();
    server.use(http.get(`${API_BASE}/orders`, () => HttpResponse.json({ data: [] })));
    const tree = (children: React.ReactNode) => (
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
    const { rerender } = render(tree(<BottomNav />));
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();

    rerender(
      tree(
        <>
          <BottomSheet open onOpenChange={() => undefined} title="Outlet status">
            <p>Body</p>
          </BottomSheet>
          <BottomNav />
        </>,
      ),
    );
    expect(screen.queryByRole('navigation', { name: /primary/i })).not.toBeInTheDocument();
    resetOverlays();
  });
});

describe('AppShell', () => {
  it('renders the top bar, primary nav and outlet content', () => {
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter initialEntries={['/orders']}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /notifications/i })).toBeInTheDocument();
    for (const label of ['Orders', 'Inventory', 'Business', 'Feedback', 'History']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // The floating help bubble renders alongside the nav (Step 7). The profile
    // nudge is absent here because the mocked profile has no email field.
    expect(screen.getByRole('button', { name: /help and support/i })).toBeInTheDocument();
  });
});
