import { AlertTriangle, Loader2, Power } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { useRestaurant } from '@/hooks/useRestaurant';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';
import type { AvailabilityStatus } from '@/services/api/restaurant';
import {
  isOutletOpen,
  openingStateOf,
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_SHORT,
  statusOf,
  statusReasonOf,
} from './outletStatus';

/**
 * Shared restaurant availability control. Used on the Home dashboard and the
 * Profile/More screen so the switch looks and behaves identically everywhere.
 *
 * The state shown is the server-confirmed one (optimistic during the request,
 * rolled back on failure). Conflicting controls are disabled while a change is
 * in flight and a spinner is shown; the new state is confirmed only after the
 * server responds. A state the backend rejects is never claimed by the client.
 */
export function RestaurantStatusControl({
  variant = 'grid',
  className,
}: {
  /** `grid` = 2x2 segmented buttons (Home); `list` = stacked rows (Profile). */
  variant?: 'grid' | 'list';
  className?: string;
}) {
  const restaurant = useRestaurant();
  const status = statusOf(restaurant.data ?? null);
  const online = isOutletOpen(status);
  const pending = restaurant.availabilityMutation.isPending;
  const loading = restaurant.isLoading;
  const reason = statusReasonOf(restaurant.data ?? null);
  const hours = openingStateOf(restaurant.data?.openingHours);
  const showHoursWarning = online && hours?.outsideHours === true;

  function apply(next: AvailabilityStatus) {
    if (next === status || pending) return;
    restaurant.availabilityMutation.mutate(next, {
      onSuccess: () => toast.success(`Restaurant is now ${STATUS_LABEL[next].toLowerCase()}.`),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Could not update status.'),
    });
  }

  return (
    <div className={cn('rounded-card border border-border bg-card p-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Power
            className={cn('h-5 w-5', online ? 'text-success-ink' : 'text-danger-ink')}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-bold text-ink">Restaurant status</p>
            <p className="text-xs text-ink-soft">{STATUS_SHORT[status]}</p>
          </div>
        </div>
        {loading ? (
          <div className="h-7 w-24 animate-pulse rounded-pill bg-border-soft" aria-hidden="true" />
        ) : (
          <StatusPill tone={online ? 'success' : 'danger'} dot>
            {online ? 'Accepting orders' : 'Not accepting'}
          </StatusPill>
        )}
      </div>

      {restaurant.isError ? (
        <p className="mt-2 text-xs text-danger-ink" role="alert">
          Could not load status.{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => void restaurant.refetch()}
          >
            Retry
          </button>
        </p>
      ) : null}

      {!online && reason ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-soft">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-ink" aria-hidden="true" />
          {reason}
        </p>
      ) : null}

      {showHoursWarning ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-warning-ink">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          You are accepting orders outside today&apos;s saved hours
          {hours?.opensAt && hours?.closesAt ? ` (${hours.opensAt}–${hours.closesAt})` : ''}.
        </p>
      ) : null}

      <div
        role="radiogroup"
        aria-label="Restaurant availability"
        className={cn(
          'mt-3 gap-2',
          variant === 'grid' ? 'grid grid-cols-2' : 'flex flex-col',
        )}
      >
        {STATUS_ORDER.map((id) => {
          const active = id === status;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending || loading || active}
              onClick={() => apply(id)}
              className={cn(
                'press relative flex min-h-tap items-center justify-center gap-2 rounded-btn border text-sm font-semibold transition-colors',
                active
                  ? 'border-brand-ink bg-brand/10 text-brand-ink'
                  : 'border-border text-ink hover:bg-border-soft',
                (pending || loading) && !active && 'opacity-50',
              )}
            >
              {pending && active ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-pill',
                    id === 'open'
                      ? 'bg-success'
                      : id === 'busy'
                        ? 'bg-warning'
                        : 'bg-danger',
                  )}
                  aria-hidden="true"
                />
              )}
              {STATUS_LABEL[id]}
            </button>
          );
        })}
      </div>

      {restaurant.availabilityMutation.isError ? (
        <p className="mt-2 text-xs text-danger-ink" role="alert">
          Could not update status. Please try again.
        </p>
      ) : null}
    </div>
  );
}
