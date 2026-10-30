import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AcceptOrderSheet } from '@/features/orders/AcceptOrderSheet';
import { NewOrderBanner } from '@/features/orders/NewOrderBanner';
import { PREP_MAX, PREP_MIN, clampPrepMinutes } from '@/features/orders/prepTime';
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

/** Props every sheet render needs; individual tests override what they assert. */
function sheetProps(order: Order, over: Partial<React.ComponentProps<typeof AcceptOrderSheet>> = {}) {
  return {
    order,
    busy: false,
    onAccept: () => {},
    onReject: () => {},
    onClose: () => {},
    ...over,
  };
}

describe('AcceptOrderSheet', () => {
  it('steps the prep time down and up with the minus/plus controls', async () => {
    const user = userEvent.setup();
    render(<AcceptOrderSheet {...sheetProps(makeOrder())} />);

    expect(screen.getByTestId('prep-minutes')).toHaveTextContent('20 mins');
    await user.click(screen.getByRole('button', { name: /Increase prep time/i }));
    expect(screen.getByTestId('prep-minutes')).toHaveTextContent('25 mins');
    await user.click(screen.getByRole('button', { name: /Decrease prep time/i }));
    await user.click(screen.getByRole('button', { name: /Decrease prep time/i }));
    expect(screen.getByTestId('prep-minutes')).toHaveTextContent('15 mins');
  });

  it('bounds the stepper at the prep-time limits', () => {
    render(<AcceptOrderSheet {...sheetProps(makeOrder(), { defaultMinutes: PREP_MIN })} />);
    const down = screen.getByRole('button', { name: /Decrease prep time/i });
    expect(down).toBeDisabled();
    expect(screen.getByTestId('prep-minutes')).toHaveTextContent(`${PREP_MIN} mins`);

    render(<AcceptOrderSheet {...sheetProps(makeOrder({ _id: 'ord_2' }), { defaultMinutes: PREP_MAX })} />);
    const ups = screen.getAllByRole('button', { name: /Increase prep time/i });
    expect(ups[1]).toBeDisabled();
    expect(screen.getAllByTestId('prep-minutes')[1]).toHaveTextContent(`${PREP_MAX} mins`);
  });

  it('passes the stepped value to onAccept', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(<AcceptOrderSheet {...sheetProps(makeOrder(), { onAccept })} />);

    await user.click(screen.getByRole('button', { name: /Increase prep time/i }));
    await user.click(screen.getByRole('button', { name: /^Accept$/ }));
    expect(onAccept).toHaveBeenCalledWith(expect.objectContaining({ _id: 'ord_1' }), 25);
  });

  it('shows the countdown in the Accept button only when the server sent a deadline', () => {
    const { rerender } = render(
      <AcceptOrderSheet
        {...sheetProps(
          makeOrder({ restaurantResponseDeadline: new Date(Date.now() + 4 * 60_000).toISOString() }),
        )}
      />,
    );
    expect(screen.getByText(/Respond within \d:\d\d/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Accept \(\d:\d\d\)$/ })).toBeInTheDocument();

    // No deadline and no createdAt: no countdown is invented at all.
    rerender(<AcceptOrderSheet {...sheetProps(makeOrder({ createdAt: '' }))} />);
    expect(screen.queryByText(/Respond within/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Accept$/ })).toBeInTheDocument();
  });

  it('drains the Accept progress fill as the acceptance window runs out', () => {
    const base = Date.now();
    render(
      <AcceptOrderSheet
        {...sheetProps(
          makeOrder({
            createdAt: new Date(base - 5 * 60_000).toISOString(),
            restaurantResponseDeadline: new Date(base + 30_000).toISOString(),
          }),
        )}
      />,
    );
    const fill = screen.getByTestId('accept-fill');
    const pct = Number.parseFloat(fill.style.width);
    // ~30s left of a 5m30s window: the fill is mostly drained but not gone.
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(50);
  });

  it('renders no progress fill when there is no deadline', () => {
    render(<AcceptOrderSheet {...sheetProps(makeOrder({ createdAt: '' }))} />);
    expect(screen.queryByTestId('accept-fill')).not.toBeInTheDocument();
  });

  it('disables both actions while busy (duplicate-tap prevention)', () => {
    render(<AcceptOrderSheet {...sheetProps(makeOrder(), { busy: true })} />);
    expect(screen.getByRole('button', { name: /Accepting…/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Reject$/ })).toBeDisabled();
  });

  it('disables Accept when the acceptance window has expired', () => {
    render(
      <AcceptOrderSheet
        {...sheetProps(
          makeOrder({ restaurantResponseDeadline: new Date(Date.now() - 60_000).toISOString() }),
        )}
      />,
    );
    expect(screen.getByText(/expired/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Accept/ })).toBeDisabled();
  });

  it('shows item quantities, prices and the customer note', () => {
    render(
      <AcceptOrderSheet
        {...sheetProps(
          makeOrder({
            customerInstructions: 'Less spicy please',
            items: [{ name: 'Masala Dosa', quantity: 2, isVeg: true, price: 130 }],
          }),
        )}
      />,
    );
    expect(screen.getByText('2×')).toBeInTheDocument();
    expect(screen.getByText('Masala Dosa')).toBeInTheDocument();
    expect(screen.getByText('₹260')).toBeInTheDocument();
    expect(screen.getByText('Less spicy please')).toBeInTheDocument();
  });

  it('shows the "Nth order by {name}" line only when the data exists', () => {
    const { rerender } = render(
      <AcceptOrderSheet
        {...sheetProps(makeOrder({ customerName: 'Asha Rao', customerOrderCount: 1 }))}
      />,
    );
    expect(screen.getByText('1st order by Asha')).toBeInTheDocument();

    rerender(<AcceptOrderSheet {...sheetProps(makeOrder({ customerName: 'Asha Rao' }))} />);
    expect(screen.queryByText(/order by/i)).not.toBeInTheDocument();
  });

  it('shows the cutlery tag only on an explicit opt-out', () => {
    const { rerender } = render(
      <AcceptOrderSheet {...sheetProps(makeOrder({ sendCutlery: false }))} />,
    );
    expect(screen.getByText(/send cutlery, tissues and straws/i)).toBeInTheDocument();

    rerender(<AcceptOrderSheet {...sheetProps(makeOrder({ sendCutlery: true }))} />);
    expect(screen.queryByText(/send cutlery, tissues and straws/i)).not.toBeInTheDocument();
  });

  it('shows the VEG ONLY line only when every item reports veg', () => {
    const { rerender } = render(
      <AcceptOrderSheet
        {...sheetProps(makeOrder({ items: [{ name: 'Dosa', quantity: 1, isVeg: true }] }))}
      />,
    );
    expect(screen.getByText(/veg only order/i)).toBeInTheDocument();

    rerender(
      <AcceptOrderSheet
        {...sheetProps(
          makeOrder({
            items: [
              { name: 'Dosa', quantity: 1, isVeg: true },
              { name: 'Chicken', quantity: 1, isVeg: false },
            ],
          }),
        )}
      />,
    );
    expect(screen.queryByText(/veg only order/i)).not.toBeInTheDocument();
  });

  it('shows the Total Bill with a PAID chip and an expandable breakdown', async () => {
    const user = userEvent.setup();
    render(
      <AcceptOrderSheet
        {...sheetProps(
          makeOrder({
            paymentStatus: 'paid',
            vendorBill: { itemSubtotal: 260, commission: 39, restaurantNetAmount: 221 },
          }),
        )}
      />,
    );
    expect(screen.getByText(/total bill/i)).toBeInTheDocument();
    expect(screen.getByText('PAID')).toBeInTheDocument();
    expect(screen.getByText('₹221')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show bill breakdown/i }));
    expect(screen.getByText('Item subtotal')).toBeInTheDocument();
    expect(screen.getByText('Platform commission')).toBeInTheDocument();
  });

  it('shows a COD chip for a cash order', () => {
    render(<AcceptOrderSheet {...sheetProps(makeOrder({ paymentMode: 'cod' }))} />);
    expect(screen.getByText('COD')).toBeInTheDocument();
  });

  it('pages between several waiting orders with "1 of N"', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const onPrev = vi.fn();
    render(
      <AcceptOrderSheet
        {...sheetProps(makeOrder(), { index: 0, total: 3, onNext, onPrev })}
      />,
    );
    expect(screen.getByText('3 new orders')).toBeInTheDocument();
    expect(screen.getAllByText('1 of 3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /^Previous$/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /^Next$/ }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('offers no pager for a single waiting order', () => {
    render(<AcceptOrderSheet {...sheetProps(makeOrder(), { total: 1 })} />);
    expect(screen.getByText('1 new order')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Next$/ })).not.toBeInTheDocument();
  });

  it('copies the order reference from the ID row', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<AcceptOrderSheet {...sheetProps(makeOrder())} />);

    expect(screen.getByText(/ID: SW-1001/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /copy order id/i }));
    expect(writeText).toHaveBeenCalledWith('SW-1001');
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

  it('names the count and opens the sheet on tap', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(
      <NewOrderBanner
        orders={[makeOrder({ _id: 'a' }), makeOrder({ _id: 'b', publicOrderId: 'SW-2' })]}
        onStop={onStop}
      />,
    );
    const bar = screen.getByRole('button', { name: /2 new orders — open/i });
    expect(bar).toHaveTextContent('You have 2 new orders');
    await user.click(bar);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('opens the sheet on an upward swipe', () => {
    const onStop = vi.fn();
    render(<NewOrderBanner orders={[makeOrder()]} onStop={onStop} />);
    const bar = screen.getByRole('button', { name: /new order — open/i });
    fireEvent.touchStart(bar, { touches: [{ clientY: 200 }] });
    fireEvent.touchEnd(bar, { changedTouches: [{ clientY: 140 }] });
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('ignores a swipe that is too short', () => {
    const onStop = vi.fn();
    render(<NewOrderBanner orders={[makeOrder()]} onStop={onStop} />);
    const bar = screen.getByRole('button', { name: /new order — open/i });
    fireEvent.touchStart(bar, { touches: [{ clientY: 200 }] });
    fireEvent.touchEnd(bar, { changedTouches: [{ clientY: 195 }] });
    expect(onStop).not.toHaveBeenCalled();
  });
});
