import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiderStatus } from '@/features/orders/RiderStatus';
import { OrderCard } from '@/features/orders/OrderCard';
import type { Order } from '@/types/order';

function makeOrder(over: Partial<Order> = {}): Order {
  return {
    _id: 'o1',
    status: 'assigned',
    publicOrderId: 'SW-1',
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe('RiderStatus — rider copy is server-sourced only', () => {
  it('renders nothing for placed/cancelled/delivered orders', () => {
    for (const status of ['placed', 'cancelled', 'delivered']) {
      const { container } = render(<RiderStatus order={makeOrder({ status })} />);
      expect(container).toBeEmptyDOMElement();
    }
  });

  it('shows the counter handover with the pickup code when the rider has reached', () => {
    render(
      <RiderStatus
        order={makeOrder({
          status: 'assigned',
          riderStatus: 'reached_restaurant',
          riderName: 'Suresh',
          pickupCode: '4821',
          reachedRestaurantAt: new Date(Date.now() - 65_000).toISOString(),
        })}
      />,
    );
    expect(screen.getByText(/has reached counter/i)).toBeInTheDocument();
    expect(screen.getByText(/#4821/)).toBeInTheDocument();
    expect(screen.getByText(/Waiting 01:0\d/)).toBeInTheDocument();
  });

  it('shows a call chip only when the server sends a rider phone', () => {
    const { rerender } = render(
      <RiderStatus order={makeOrder({ riderStatus: 'assigned', riderName: 'Suresh' })} />,
    );
    expect(screen.queryByRole('link', { name: /Call/i })).not.toBeInTheDocument();

    rerender(
      <RiderStatus
        order={makeOrder({ riderStatus: 'assigned', riderName: 'Suresh', riderPhone: '9876543210' })}
      />,
    );
    const call = screen.getByRole('link', { name: /Call/i });
    expect(call).toHaveAttribute('href', 'tel:9876543210');
  });

  it('never invents an ETA when the server is silent', () => {
    render(<RiderStatus order={makeOrder({ riderStatus: 'assigned', riderName: 'Suresh' })} />);
    expect(screen.getByText(/is arriving shortly/i)).toBeInTheDocument();
  });

  it('falls back to the waiting copy for a confirmed order with no rider data', () => {
    render(<RiderStatus order={makeOrder({ status: 'confirmed' })} />);
    expect(screen.getByText(/Waiting for rider assignment/i)).toBeInTheDocument();
  });
});

describe('OrderCard — cutlery and scheduled strips', () => {
  function renderCard(over: Partial<Order> = {}) {
    return render(
      <OrderCard
        order={makeOrder({ status: 'confirmed', ...over })}
        busy={false}
        onAccept={() => {}}
        onReject={() => {}}
        onAdvance={() => {}}
        onReady={() => {}}
        onExtendPrep={() => {}}
        onVerifyOtp={() => {}}
      />,
    );
  }

  it('renders the cutlery preference only when explicitly sent', () => {
    renderCard({ sendCutlery: true });
    expect(screen.getByText(/Send cutlery/i)).toBeInTheDocument();
  });

  it('renders a scheduled slot only for a future delivery time', () => {
    const future = new Date(Date.now() + 60 * 60_000).toISOString();
    renderCard({ scheduledAt: future });
    expect(screen.getByText(/Scheduled for/i)).toBeInTheDocument();
  });

  it('does not render a scheduled strip for a past slot', () => {
    const past = new Date(Date.now() - 60 * 60_000).toISOString();
    renderCard({ scheduledAt: past });
    expect(screen.queryByText(/Scheduled for/i)).not.toBeInTheDocument();
  });
});
