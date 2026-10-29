import { Clock3, MessageSquare, Printer, Bike } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { enumLabel, formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import {
  billRows,
  commissionPctOf,
  dietOf,
  isResponseExpired,
  loyaltySubtitle,
  orderBillOf,
  orderCountWithRestaurant,
  orderRef,
  orderTotalOf,
  paymentModeOf,
  pickupCodeOf,
  ticketStamp,
} from '@/features/orders/orderDomain';
import type { Order, OrderItem } from '@/types/order';

export interface OrderCardProps {
  order: Order;
  /** Restaurant delivery mode, for the self-delivery PIN gate. */
  deliveryMode?: string | undefined;
  busy?: boolean;
  onAccept: (order: Order) => void;
  onReject: (order: Order) => void;
  onAdvance: (order: Order) => void;
  onReady: (order: Order) => void;
  onVerifyOtp: (order: Order) => void;
}

function DietMark({ item }: { item: OrderItem }) {
  const diet = dietOf(item);
  if (!diet) return null;
  return (
    <span
      className={cn(
        'shrink-0 rounded-[3px] border px-1 text-[10px] font-bold leading-4',
        diet === 'veg' ? 'border-success text-success' : 'border-danger text-danger',
      )}
    >
      {diet === 'veg' ? 'VEG' : 'NON'}
    </span>
  );
}

function ItemRow({ item }: { item: OrderItem }) {
  const qty = Number(item.quantity) || 1;
  return (
    <li className="flex items-start gap-2 py-1.5">
      <span className="w-6 shrink-0 text-sm font-bold tabular-nums text-ink-soft">{qty}×</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{item.name || 'Item'}</span>
      </span>
      <DietMark item={item} />
    </li>
  );
}

/**
 * A single order card. Renders only fields the server supplies — the total,
 * bill breakdown, payment mode, commission and rider state each appear only
 * when the corresponding server data exists (never invented).
 */
export function OrderCard({
  order,
  deliveryMode,
  busy = false,
  onAccept,
  onReject,
  onAdvance,
  onReady,
  onVerifyOtp,
}: OrderCardProps) {
  const items = Array.isArray(order.items) ? order.items : [];
  const ref = orderRef(order);
  const total = orderTotalOf(order);
  const code = pickupCodeOf(order);
  const expired = isResponseExpired(order);
  const rows = billRows(order);
  const bill = orderBillOf(order) ?? {};
  const pct = commissionPctOf(order);
  const mode = paymentModeOf(order);
  const count = orderCountWithRestaurant(order);
  const stamp = ticketStamp(order);
  const note =
    order.customerInstructions || order.instructions || order.deliveryInstructions || order.restaurantNote;
  const selfDelivery = deliveryMode === 'self_delivery' || order.deliveryModeSnapshot === 'self_delivery';
  const rider = String(order.riderStatus || order.deliveryRiderStatus || order.riderState || '').toLowerCase();

  const disabled = busy || expired;

  let footer: React.ReactNode = null;
  switch (order.status) {
    case 'placed':
      footer = (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onReject(order)}
            className="min-h-tap flex-1 rounded-btn border border-border text-sm font-bold text-ink disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAccept(order)}
            className="min-h-tap flex-1 rounded-btn bg-brand text-sm font-bold text-white disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      );
      break;
    case 'confirmed':
      footer = (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdvance(order)}
          className="mt-3 min-h-tap w-full rounded-btn bg-brand text-sm font-bold text-white disabled:opacity-50"
        >
          Start preparing
        </button>
      );
      break;
    case 'preparing':
      footer = (
        <button
          type="button"
          disabled={busy}
          onClick={() => onReady(order)}
          className="mt-3 min-h-tap w-full rounded-btn bg-brand text-sm font-bold text-white disabled:opacity-50"
        >
          Order Ready
        </button>
      );
      break;
    case 'waiting_for_rider':
      footer = (
        <StatusPill tone="warning" dot>
          Food ready · Finding a rider…
        </StatusPill>
      );
      break;
    case 'assigned':
      footer = (
        <StatusPill tone="info" dot>
          Rider assigned
        </StatusPill>
      );
      break;
    case 'out_for_delivery':
      footer =
        selfDelivery ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onVerifyOtp(order)}
            className="mt-3 min-h-tap w-full rounded-btn bg-brand text-sm font-bold text-white disabled:opacity-50"
          >
            Verify delivery PIN
          </button>
        ) : (
          <StatusPill tone="info" dot>
            Picked up · Out for delivery
          </StatusPill>
        );
      break;
    case 'otp_verified':
      footer = (
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdvance(order)}
          className="mt-3 min-h-tap w-full rounded-btn bg-brand text-sm font-bold text-white disabled:opacity-50"
        >
          Mark delivered
        </button>
      );
      break;
    case 'delivered':
      footer = <StatusPill tone="success">Delivered</StatusPill>;
      break;
    case 'cancelled':
      footer = <StatusPill tone="danger">Cancelled</StatusPill>;
      break;
    default:
      footer = <StatusPill tone="neutral">{enumLabel(order.status)}</StatusPill>;
  }

  return (
    <article
      className={cn(
        'rounded-card border bg-card p-4 shadow-sm',
        order.status === 'placed' ? 'border-brand/40 ring-1 ring-brand/20' : 'border-border',
      )}
      aria-label={`Order ${ref}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {code ? (
            <StatusPill tone="neutral">PICKUP #{code}</StatusPill>
          ) : null}
          {count !== null ? (
            <span className="text-[11px] font-medium text-ink-faint">{count} with you</span>
          ) : null}
        </div>
        {order.status === 'placed' ? (
          <span
            className={cn(
              'text-[11px] font-semibold',
              expired ? 'text-danger' : 'text-ink-soft',
            )}
          >
            {expired ? 'Response window expired' : 'Respond within 5:00'}
          </span>
        ) : null}
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-2">
        <h3 className="text-base font-extrabold text-ink">#{ref}</h3>
        <span className="text-xs font-semibold text-ink-soft tabular-nums">#{ref}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <span className="font-semibold text-ink">{loyaltySubtitle(order)}</span>
        {stamp ? (
          <time className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" aria-hidden="true" />
            {stamp}
          </time>
        ) : null}
      </div>

      {items.length ? (
        <details className="mt-2" open={order.status === 'placed'}>
          <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
            {items.length} item{items.length === 1 ? '' : 's'}
          </summary>
          <ul className="mt-1 divide-y divide-border-soft">
            {items.map((item, i) => (
              <ItemRow key={i} item={item} />
            ))}
          </ul>
        </details>
      ) : (
        <p className="mt-2 text-xs text-ink-faint">No items listed</p>
      )}

      {rider ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-info">
          <Bike className="h-3.5 w-3.5" aria-hidden="true" />
          Rider {rider.replace(/_/g, ' ')}
        </p>
      ) : null}

      {note ? (
        <p className="mt-2 inline-flex items-start gap-1 rounded-btn bg-warning-bg px-2 py-1.5 text-xs text-warning">
          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{String(note)}</span>
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3">
        <span className="text-lg font-extrabold tabular-nums text-ink">
          {total !== null ? formatMoney(total) : '—'}
        </span>
        {mode ? (
          <StatusPill tone={mode === 'upi' ? 'success' : 'neutral'}>
            {mode === 'upi' ? 'Paid online' : 'COD'}
          </StatusPill>
        ) : null}
      </div>

      {rows.length ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
            Bill breakdown
          </summary>
          <dl className="mt-1 space-y-1 text-xs">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between">
                <dt className={cn(row.kind === 'total' && 'font-bold text-ink')}>
                  {row.label}
                  {row.label === 'Platform commission' && pct !== null ? ` (${pct}%)` : ''}
                </dt>
                <dd
                  className={cn(
                    'tabular-nums',
                    row.kind === 'total' && 'font-bold text-ink',
                    row.kind === 'neg' && 'text-ink-soft',
                  )}
                >
                  {row.kind === 'neg' ? '−' : ''}
                  {formatMoney(Math.abs(row.value))}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ) : (
        <p className="mt-2 text-[11px] text-ink-faint">
          {bill && Object.keys(bill).length
            ? null
            : 'A detailed breakdown is not available for this order.'}
        </p>
      )}

      {order.status === 'cancelled' && order.cancelReason ? (
        <p className="mt-2 rounded-btn bg-danger-bg px-2 py-1.5 text-xs text-danger">
          <strong>Reason </strong>
          {order.cancelReason}
        </p>
      ) : null}

      {footer}

      <div className="mt-3 flex gap-2 text-xs">
        <button
          type="button"
          className="inline-flex min-h-tap flex-1 items-center justify-center gap-1 rounded-btn border border-border text-ink-soft"
          aria-label="Print KOT"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden="true" /> KOT
        </button>
      </div>
    </article>
  );
}
