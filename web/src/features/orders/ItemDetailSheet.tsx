import { Sheet } from '@/components/Sheet';
import { DietMark } from '@/components/DietMark';
import { itemDetailOf } from '@/features/orders/orderDomain';
import type { OrderItem } from '@/types/order';

/**
 * Item customisation sheet (Phase 3, Step 5). Opened only from an item that has
 * real detail data — variant, add-ons and/or a note — so the sheet never shows
 * an empty body. Everything comes from the server item; nothing is invented.
 */
export function ItemDetailSheet({
  item,
  onClose,
}: {
  item: OrderItem | null;
  onClose: () => void;
}) {
  const detail = itemDetailOf(item);
  if (!item || !detail) return null;

  const qty = Number(item.quantity) || 1;

  return (
    <Sheet onClose={onClose} title={item.name || 'Item'}>
      <div className="flex items-start gap-2.5">
        <DietMark item={item} />
        <span className="w-8 shrink-0 text-base font-extrabold tabular-nums text-ink">{qty}×</span>
        <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-ink">
          {item.name || 'Item'}
        </span>
      </div>

      <dl className="mt-3 space-y-2.5 text-sm">
        {detail.variant ? (
          <div>
            <dt className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">
              Variant
            </dt>
            <dd className="text-ink">{detail.variant}</dd>
          </div>
        ) : null}
        {detail.addons.length ? (
          <div>
            <dt className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">
              Add-ons
            </dt>
            <dd className="text-ink">{detail.addons.join(', ')}</dd>
          </div>
        ) : null}
        {detail.note ? (
          <div>
            <dt className="text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">
              Note
            </dt>
            <dd className="text-ink">{detail.note}</dd>
          </div>
        ) : null}
      </dl>
    </Sheet>
  );
}
