import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderChips } from '@/features/orders/OrderChips';

const chips = [
  { id: 'preparing', label: 'Preparing', count: 2 },
  { id: 'ready', label: 'Ready', count: 0 },
  { id: 'dispatch', label: 'Picked up', count: 5 },
];

describe('OrderChips', () => {
  it('shows every chip with its count, including zero', () => {
    render(<OrderChips chips={chips} active="preparing" onSelect={() => {}} />);
    expect(screen.getByRole('tab', { name: /Preparing \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Ready \(0\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Picked up \(5\)/i })).toBeInTheDocument();
  });

  it('marks only the active chip selected', () => {
    render(<OrderChips chips={chips} active="ready" onSelect={() => {}} />);
    expect(screen.getByRole('tab', { name: /Ready/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Preparing/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onSelect with the chip id', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<OrderChips chips={chips} active="preparing" onSelect={onSelect} />);
    await user.click(screen.getByRole('tab', { name: /Picked up/i }));
    expect(onSelect).toHaveBeenCalledWith('dispatch');
  });
});
