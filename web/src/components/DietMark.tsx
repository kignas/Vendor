import { dietOf } from '@/features/orders/orderDomain';
import { cn } from '@/lib/cn';
import type { OrderItem } from '@/types/order';

/**
 * Veg / non-veg mark in the familiar Indian packaging style: a coloured square
 * outline with a dot. An empty same-size slot keeps item names aligned when the
 * server did not say (the diet is never guessed). Shared by the order card and
 * the new-order sheet.
 */
export function DietMark({ item }: { item: OrderItem }) {
  const diet = dietOf(item);
  if (!diet) return <span className="h-4 w-4 shrink-0" aria-hidden="true" />;
  const veg = diet === 'veg';
  return (
    <span
      role="img"
      aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}
      className={cn(
        'mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-2',
        veg ? 'border-success' : 'border-danger',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', veg ? 'bg-success' : 'bg-danger')} />
    </span>
  );
}
