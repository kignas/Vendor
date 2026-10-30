import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { useRestaurant } from '@/hooks/useRestaurant';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';
import { isOutletOpen, statusOf } from './outletStatus';

/**
 * Restaurant online/offline switch (Zomato-style) for the top-left of the
 * header. "Online" = accepting new orders; "Offline" = paused.
 *
 * The state is the server's (`availability`), persisted through
 * `PUT /restaurant/availability`, so it survives refresh and re-login. Going
 * offline asks for confirmation ("Stop receiving new orders?"); going online
 * is immediate. The change is single-flight and rolls back to the server value
 * if the backend rejects it (e.g. a vendor who does not own this restaurant).
 */
export function OnlineSwitch({ className }: { className?: string }) {
  const restaurant = useRestaurant();
  const online = isOutletOpen(statusOf(restaurant.data ?? null));
  const pending = restaurant.availabilityMutation.isPending;
  const inFlight = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function apply(next: boolean) {
    if (inFlight.current) return;
    inFlight.current = true;
    restaurant.availabilityMutation.mutate(next ? 'open' : 'temporarily_closed', {
      onSuccess: () => toast.success(next ? 'You are online.' : 'You are offline.'),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Could not update status.'),
      onSettled: () => {
        inFlight.current = false;
      },
    });
  }

  function onToggle() {
    if (pending || inFlight.current) return;
    if (online) setConfirmOpen(true);
    else apply(true);
  }

  const label = online ? 'Online' : 'Offline';

  return (
    <div className={cn('flex items-center', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={online}
        aria-label={label}
        aria-busy={pending}
        onClick={onToggle}
        className={cn(
          'press inline-flex min-h-tap items-center gap-2 rounded-pill border px-2.5 text-[11px] font-bold transition-colors',
          online
            ? 'border-success/40 bg-success-bg text-success-ink'
            : 'border-border bg-border-soft text-ink-soft',
        )}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <span
            className={cn(
              'relative inline-flex h-4 w-7 shrink-0 items-center rounded-pill transition-colors',
              online ? 'bg-success' : 'bg-ink-faint',
            )}
            aria-hidden="true"
          >
            <span
              className={cn(
                'absolute h-3 w-3 rounded-pill bg-white transition-transform duration-200 ease-out motion-reduce:transition-none',
                online ? 'translate-x-3.5' : 'translate-x-0.5',
              )}
            />
          </span>
        )}
        {label}
      </button>

      {confirmOpen ? (
        <Sheet
          title="Stop receiving new orders?"
          description="Your restaurant will show as unavailable to customers. Orders already in progress continue as normal."
          onClose={() => setConfirmOpen(false)}
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="min-h-tap flex-1 rounded-btn border border-border text-sm font-bold text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                apply(false);
              }}
              className="min-h-tap flex-1 rounded-btn bg-danger text-sm font-bold text-white"
            >
              Go offline
            </button>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
