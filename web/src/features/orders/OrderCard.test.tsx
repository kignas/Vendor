import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderCard } from '@/features/orders/OrderCard';
import type { Order } from '@/types/order';

function makeOrder(over: Partial<Order> = {}): Order {
  return {
    _id: 'o1',
    status: 'preparing',
    publicOrderId: 'SW-7500',
    createdAt: new Date().toISOString(),
    items: [{ name: 'Masala Dosa', quantity: 2, isVeg: true }],
    ...over,
  };
}

const noop = () => undefined;

function renderCard(over: Partial<Order> = {}, props: Partial<React.ComponentProps<typeof OrderCard>> = {}) {
  return render(
    <OrderCard
      order={makeOrder(over)}
      busy={false}
      onAccept={noop}
      onReject={noop}
      onAdvance={noop}
      onReady={noop}
      onExtendPrep={noop}
      onVerifyOtp={noop}
      {...props}
    />,
  );
}

describe('OrderCard — row 1 actions menu', () => {
  it('shows the ID, copy button and kebab menu', async () => {
    renderCard();
    expect(screen.getByText(/ID: SW-7500/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy order ID/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Order actions/i })).toBeInTheDocument();
  });

  it('fires Print KOT, Read aloud and Get help from the kebab menu', async () => {
    const user = userEvent.setup();
    const onKot = vi.fn();
    const onSpeak = vi.fn();
    const onSupport = vi.fn();
    renderCard({}, { onKot, onSpeak, onSupport });

    await user.click(screen.getByRole('button', { name: /Order actions/i }));
    await user.click(screen.getByRole('menuitem', { name: /Print KOT/i }));
    expect(onKot).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Order actions/i }));
    await user.click(screen.getByRole('menuitem', { name: /Read aloud/i }));
    expect(onSpeak).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Order actions/i }));
    await user.click(screen.getByRole('menuitem', { name: /Get help/i }));
    expect(onSupport).toHaveBeenCalledTimes(1);
  });

  it('offers Extend prep only while preparing, and only once', async () => {
    const user = userEvent.setup();
    const onExtendPrep = vi.fn();
    const { rerender } = render(
      <OrderCard
        order={makeOrder()}
        busy={false}
        onAccept={noop}
        onReject={noop}
        onAdvance={noop}
        onReady={noop}
        onExtendPrep={onExtendPrep}
        onVerifyOtp={noop}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Order actions/i }));
    const extend = screen.getByRole('menuitem', { name: /Extend prep \(\+5 min\)/i });
    await user.click(extend);
    expect(onExtendPrep).toHaveBeenCalledTimes(1);

    // Once the session marks it used, the item is disabled.
    rerender(
      <OrderCard
        order={makeOrder()}
        busy={false}
        extendedIds={new Set(['o1'])}
        onAccept={noop}
        onReject={noop}
        onAdvance={noop}
        onReady={noop}
        onExtendPrep={onExtendPrep}
        onVerifyOtp={noop}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Order actions/i }));
    expect(screen.getByRole('menuitem', { name: /\+5 min added/ })).toBeDisabled();
  });

  it('hides Extend prep for a non-preparing order', async () => {
    const user = userEvent.setup();
    renderCard({ status: 'confirmed' });
    await user.click(screen.getByRole('button', { name: /Order actions/i }));
    expect(screen.queryByRole('menuitem', { name: /Extend prep/i })).not.toBeInTheDocument();
  });
});

describe('OrderCard — item detail sheet', () => {
  it('opens the item sheet from the name only when the item has detail data', async () => {
    const user = userEvent.setup();
    renderCard({
      items: [
        {
          name: 'Paneer Tikka',
          quantity: 1,
          isVeg: true,
          variant: 'Half',
          addons: [{ name: 'Extra Raita' }, 'Extra Chutney'],
          note: 'No onion',
        },
      ],
    });

    await user.click(screen.getByRole('button', { name: /View details for Paneer Tikka/i }));
    const sheet = await screen.findByRole('dialog', { name: /Paneer Tikka/i });
    expect(within(sheet).getByText('Half')).toBeInTheDocument();
    expect(within(sheet).getByText('Extra Raita, Extra Chutney')).toBeInTheDocument();
    expect(within(sheet).getByText('No onion')).toBeInTheDocument();
  });

  it('does not make a plain item name tappable', () => {
    renderCard({ items: [{ name: 'Masala Dosa', quantity: 2, isVeg: true }] });
    expect(screen.queryByRole('button', { name: /View details/i })).not.toBeInTheDocument();
  });
});

describe('OrderCard — bill breakdown', () => {
  it('expands the bill breakdown when the server supplies bill rows', async () => {
    const user = userEvent.setup();
    renderCard({
      vendorBill: { itemSubtotal: 260, commission: 39, restaurantNetAmount: 221 },
    });

    const toggle = screen.getByRole('button', { name: /Show bill breakdown/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Item subtotal')).toBeInTheDocument();
    expect(screen.getByText('Your net receivable')).toBeInTheDocument();
  });

  it('shows no expand control when the server sent no bill', () => {
    renderCard();
    expect(screen.queryByRole('button', { name: /Show bill breakdown/i })).not.toBeInTheDocument();
  });
});

describe('OrderCard — rider box', () => {
  it('hides the rider box when the server sent no rider data', () => {
    renderCard({ status: 'waiting_for_rider' });
    // The footer status pill may say "Food ready · Finding a rider…", but the
    // bordered rider box must not appear without real rider data.
    expect(screen.queryByText(/Waiting for rider assignment/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Rider .* is arriving/i)).not.toBeInTheDocument();
  });

  it('shows the rider box with real rider data and never invents a count', () => {
    renderCard({
      status: 'assigned',
      riderStatus: 'assigned',
      riderName: 'Suresh',
      riderEtaMinutes: 4,
    });
    expect(screen.getByText(/Suresh/)).toBeInTheDocument();
    expect(screen.getByText(/is arriving/i)).toBeInTheDocument();
    expect(screen.queryByText(/riders nearby/i)).not.toBeInTheDocument();
  });
});
