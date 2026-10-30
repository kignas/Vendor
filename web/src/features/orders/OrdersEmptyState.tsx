import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { StorefrontIllustration } from '@/components/StorefrontIllustration';
import { useRestaurant } from '@/hooks/useRestaurant';
import { statusOf, statusReasonOf } from '@/features/restaurant/outletStatus';
import { ordersEmptyCopy } from '@/features/orders/ordersEmptyState';
import type { OrderTab } from '@/types/order';

/**
 * The Orders list empty state (Phase 3, Step 8). A storefront illustration plus
 * copy derived from the server's availability status, with a single action that
 * turns orders back on when the outlet is paused/offline.
 *
 * The action is the SAME `PUT /restaurant/availability` mutation the header
 * control uses (no new endpoint) and is single-flight: a double tap sends one
 * request. While the availability query is loading or failed, `statusOf` is not
 * consulted for a claim — `ordersEmptyCopy(null, …)` yields the neutral
 * illustration with no status text and no action.
 */
export function OrdersEmptyState({ tab = 'preparing' }: { tab?: OrderTab }) {
  const restaurant = useRestaurant();
  // A null status while loading/error means "unknown" → neutral copy, no action.
  const status = restaurant.isSuccess ? statusOf(restaurant.data ?? null) : null;
  const reason = restaurant.isSuccess ? statusReasonOf(restaurant.data ?? null) : null;
  const copy = ordersEmptyCopy(status, reason, tab);

  // Single-flight mirrors the order actions: a ref guard (synchronous, closes
  // the double-tap gap) plus a state flag that disables the button while the
  // request is in flight.
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const pending = busy || restaurant.availabilityMutation.isPending;

  function turnOn() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    restaurant.availabilityMutation.mutate('open', {
      onSuccess: () => toast.success('You are online.'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update status.'),
      onSettled: () => {
        inFlight.current = false;
        setBusy(false);
      },
    });
  }

  const action = copy.action ? (
    <button
      type="button"
      onClick={turnOn}
      disabled={pending}
      className="press inline-flex min-h-tap items-center gap-2 rounded-btn bg-success px-5 text-sm font-bold text-white disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : null}
      {copy.action === 'resume' ? 'Resume orders' : 'Turn on Online'}
    </button>
  ) : undefined;

  return (
    <EmptyState
      title={copy.title}
      description={copy.body}
      illustration={<StorefrontIllustration variant={copy.variant} />}
      action={action}
    />
  );
}
