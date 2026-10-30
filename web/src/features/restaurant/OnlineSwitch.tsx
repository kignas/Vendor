import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useRestaurant } from '@/hooks/useRestaurant';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';
import { OutletStatusSheet } from './OutletStatusSheet';
import { isOutletOpen, STATUS_PILL, STATUS_PILL_TONE, statusOf } from './outletStatus';

/** Pill colours per tone: green online, amber busy/paused, grey offline. */
const PILL = {
  online: 'border-success/40 bg-success-bg text-success-ink',
  amber: 'border-warning/40 bg-warning-bg text-warning-ink',
  offline: 'border-border bg-border-soft text-ink-soft',
} as const;

/**
 * The ONE availability control, top-left of the header. A pill showing the
 * server's state: green "Online" while orders are accepted, amber
 * "Busy"/"Paused", grey "Offline".
 *
 * Tapping opens the shared `OutletStatusSheet` (which owns the real
 * `PUT /restaurant/availability`) so the vendor can pick the exact status, with
 * one shortcut: from the fully-off "Offline" state (`closed_today`) tapping
 * resumes orders directly through the same endpoint. Single-flight (a double tap
 * sends one request); the state is server-authoritative and rolls back on
 * failure.
 */
export function OnlineSwitch({ className }: { className?: string }) {
  const restaurant = useRestaurant();
  const status = statusOf(restaurant.data ?? null);
  const online = isOutletOpen(status);
  const tone = STATUS_PILL_TONE[status];
  const label = STATUS_PILL[status];
  const pending = restaurant.availabilityMutation.isPending;
  const inFlight = useRef(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  function goOnline() {
    if (inFlight.current) return;
    inFlight.current = true;
    restaurant.availabilityMutation.mutate('open', {
      onSuccess: () => toast.success('You are online.'),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Could not update status.'),
      onSettled: () => {
        inFlight.current = false;
      },
    });
  }

  function onTap() {
    if (pending || inFlight.current) return;
    // Only the fully-off state resumes orders directly; otherwise open the sheet
    // so the vendor chooses the status (and, when pausing, how long).
    if (status === 'closed_today') goOnline();
    else setSheetOpen(true);
  }

  return (
    <div className={cn('flex items-center', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={online}
        aria-label={`Availability: ${label}. Change status`}
        aria-busy={pending}
        onClick={onTap}
        className={cn(
          'press inline-flex min-h-tap items-center gap-1.5 rounded-pill border px-3 text-[13px] font-bold transition-colors',
          PILL[tone],
        )}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <span className="h-2 w-2 rounded-pill bg-current" aria-hidden="true" />
        )}
        {label}
      </button>

      <OutletStatusSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
