import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AcceptOrderSheet } from '@/features/orders/AcceptOrderSheet';
import { NewOrderBanner } from '@/features/orders/NewOrderBanner';
import { clampPrepMinutes } from '@/features/orders/prepTime';
import type { Order } from '@/types/order';

function makeOrder(over: Partial<Order> = {}): Order {
  return {
    _id: 'ord_1',
    status: 'placed',
    publicOrderId: 'SW-1001',
    createdAt: new Date().toISOString(),
    items: [{ name: 'Masala Dosa', quantity: 2 }],
    ...over,
  };
}

describe('AcceptOrderSheet', () => {
  it('steps the prep time down and up with the minus/plus controls', async () => {
    const user = userEvent.setup();
    render(
      <AcceptOrderSheet order={makeOrder()} busy={false} onAccept={() => {}} onReject={() => {}} onClose={() => {}} />,
    );

    expect(screen.getByTestId('prep-minutes')).toHaveTextContent('20 min');
    await user.click(screen.getByRole('button', { name: /Increase prep time/i }));
    expect(screen.getByTestId('prep-minutes')).toHaveTextContent('25 min');
    await user.click(screen.getByRole('button', { name: /Decrease prep time/i }));
    await user.click(screen.getByRole('button', { name: /Decrease prep time/i }));
    expect(screen.getByTestId('prep-minutes')).toHaveTextContent('15 min');
  });

  it('passes the stepped value to onAccept', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(
      <AcceptOrderSheet order={makeOrder()} busy={false} onAccept={onAccept} onReject={() => {}} onClose={() => {}} />,
    );

    await user.click(screen.getByRole('button', { name: /Increase prep time/i }));
    await user.click(screen.getByRole('button', { name: /^Accept$/ }));
    expect(onAccept).toHaveBeenCalledWith(expect.objectContaining({ _id: 'ord_1' }), 25);
  });

  it('shows a live countdown only when the server sent a deadline', () => {
    const { rerender } = render(
      <AcceptOrderSheet
        order={makeOrder({ restaurantResponseDeadline: new Date(Date.now() + 4 * 60_000).toISOString() })}
        busy={false}
        onAccept={() => {}}
        onReject={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/Respond within \d:\d\d/)).toBeInTheDocument();

    // No deadline and no createdAt: no countdown is invented at all.
    rerender(
      <AcceptOrderSheet
        order={makeOrder({ createdAt: '' })}
        busy={false}
        onAccept={() => {}}
        onReject={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText(/Respond within/i)).not.toBeInTheDocument();
  });

  it('disables both actions while busy (duplicate-tap prevention)', () => {
    render(
      <AcceptOrderSheet order={makeOrder()} busy onAccept={() => {}} onReject={() => {}} onClose={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /Accepting…/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Reject$/ })).toBeDisabled();
  });

  it('disables Accept when the acceptance window has expired', () => {
    render(
      <AcceptOrderSheet
        order={makeOrder({ restaurantResponseDeadline: new Date(Date.now() - 60_000).toISOString() })}
        busy={false}
        onAccept={() => {}}
        onReject={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Accept$/ })).toBeDisabled();
  });

  it('shows item quantities and the customer note', () => {
    render(
      <AcceptOrderSheet
        order={makeOrder({ customerInstructions: 'Less spicy please' })}
        busy={false}
        onAccept={() => {}}
        onReject={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('2×')).toBeInTheDocument();
    expect(screen.getByText('Masala Dosa')).toBeInTheDocument();
    expect(screen.getByText('Less spicy please')).toBeInTheDocument();
  });
});

describe('clampPrepMinutes', () => {
  it('keeps the prep time within bounds', () => {
    expect(clampPrepMinutes(0)).toBe(5);
    expect(clampPrepMinutes(500)).toBe(120);
    expect(clampPrepMinutes(20)).toBe(20);
  });
});

describe('NewOrderBanner', () => {
  it('renders nothing when no order is waiting', () => {
    const { container } = render(<NewOrderBanner orders={[]} onStop={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names the count and offers Stop when orders are waiting', () => {
    render(
      <NewOrderBanner
        orders={[makeOrder({ _id: 'a' }), makeOrder({ _id: 'b', publicOrderId: 'SW-2' })]}
        onStop={() => {}}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('2 new orders waiting');
    expect(screen.getByRole('button', { name: /Stop/i })).toBeInTheDocument();
  });
});
