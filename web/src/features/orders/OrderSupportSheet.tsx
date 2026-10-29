import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, LifeBuoy } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { orderRef } from '@/features/orders/orderDomain';
import { createTicket } from '@/services/api/support';
import { cn } from '@/lib/cn';
import type { Order } from '@/types/order';

/** Mirrors the legacy SUPPORT_KIND map. */
const SUPPORT_KIND = {
  delivery: {
    label: 'Delivery partner related concern',
    subject: 'Delivery partner concern',
    category: 'delivery',
  },
  order: { label: 'Order related concern', subject: 'Order concern', category: 'order' },
  cancellation: {
    label: 'Reject the order',
    subject: 'Order cancellation request',
    category: 'order',
  },
} as const;

type SupportKind = keyof typeof SUPPORT_KIND;

const MAX_LEN = 2000;

/**
 * Per-order support drawer. Mirrors the legacy `openOrderSupport` flow: pick a
 * concern, describe it, then POST /support. A cancellation is only ever a
 * request for review — the copy says so and nothing is cancelled locally.
 */
export function OrderSupportSheet({
  order,
  vendorName,
  onClose,
}: {
  order: Order | null;
  vendorName: string;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<SupportKind | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function close() {
    setKind(null);
    setMessage('');
    setBusy(false);
    onClose();
  }

  const ref = order ? `#${orderRef(order)}` : '';

  async function submit() {
    if (!order || !kind) return;
    const meta = SUPPORT_KIND[kind];
    const trimmed = message.trim();
    if (!trimmed) {
      toast.error('Please describe the issue.');
      return;
    }
    if (trimmed.length > MAX_LEN) {
      toast.error('Message is too long.');
      return;
    }
    setBusy(true);
    try {
      const orderRefStr = orderRef(order);
      const subject = meta.subject + (orderRefStr ? ` · #${orderRefStr}` : '');
      await createTicket({
        subject,
        category: meta.category,
        message: trimmed,
        orderId: order._id,
      });
      toast.success('Support ticket created. The Eatswada team will respond.');
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the ticket.');
      setBusy(false);
    }
  }

  return (
    <Sheet
      onClose={close}
      title="Eatswada Support"
      description={
        kind
          ? kind === 'cancellation'
            ? 'Cancelling an accepted order can affect the customer, refunds and settlement. This sends a request for review — it does not cancel the order immediately.'
            : `${SUPPORT_KIND[kind].label}${ref ? ` · ${ref}` : ''} — describe the issue`
          : `Hello ${vendorName || 'there'}, what help do you need for order ID ${ref}?`
      }
    >
      {!kind ? (
        <ul className="space-y-2">
          {(Object.keys(SUPPORT_KIND) as SupportKind[]).map((k) => (
            <li key={k}>
              <button
                type="button"
                onClick={() => setKind(k)}
                className="flex min-h-tap w-full items-center gap-2 rounded-btn border border-border bg-card px-3 text-left text-sm font-semibold text-ink"
              >
                <LifeBuoy className="h-4 w-4 text-brand" aria-hidden="true" />
                {SUPPORT_KIND[k].label}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setKind(null)}
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-ink-soft"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
          </button>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
            rows={4}
            aria-label="Describe the issue"
            placeholder="Describe the issue"
            className="w-full rounded-btn border border-border bg-card p-3 text-sm text-ink outline-none focus-visible:border-brand"
          />
          <p className={cn('mt-1 text-right text-[11px]', message.length >= MAX_LEN ? 'text-danger' : 'text-ink-faint')}>
            {message.length} / {MAX_LEN}
          </p>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !message.trim()}
            className="mt-2 min-h-tap w-full rounded-btn bg-brand text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? 'Submitting…' : 'Submit request'}
          </button>
        </>
      )}
    </Sheet>
  );
}
