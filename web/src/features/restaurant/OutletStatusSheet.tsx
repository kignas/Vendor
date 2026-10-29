import { BottomSheet } from '@/components/BottomSheet';
import { useRestaurant } from '@/hooks/useRestaurant';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';
import type { AvailabilityStatus } from '@/services/api/restaurant';
import { STATUS_LABEL, STATUS_OPTIONS, statusOf } from './outletStatus';

export function OutletStatusSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const restaurant = useRestaurant();
  const current = statusOf(restaurant.data ?? null);

  function apply(next: AvailabilityStatus) {
    restaurant.availabilityMutation.mutate(next, {
      onSuccess: () => {
        toast.success(`Status: ${STATUS_LABEL[next]}.`);
        onOpenChange(false);
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Could not update availability.'),
    });
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Outlet status">
      <p className="px-5 pb-2 text-xs text-ink-soft">
        Tell Eatswada whether you can take new orders right now.
      </p>
      <div className="px-5 pb-5">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => apply(opt.id)}
            disabled={restaurant.availabilityMutation.isPending}
            className={cn(
              'flex w-full items-center gap-3 border-t border-border-soft py-3 text-left disabled:opacity-50',
              opt.id === current && 'font-bold',
            )}
          >
            <span
              className={cn(
                'h-2.5 w-2.5 shrink-0 rounded-pill',
                opt.id === 'open'
                  ? 'bg-success'
                  : opt.id === 'busy'
                    ? 'bg-warning'
                    : 'bg-danger',
              )}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-ink">{STATUS_LABEL[opt.id]}</span>
              <span className="block text-xs text-ink-soft">{opt.hint}</span>
            </span>
            {opt.id === current ? <span className="text-xs text-brand-ink">Current</span> : null}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
