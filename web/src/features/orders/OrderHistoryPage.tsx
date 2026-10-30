import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { StorefrontIllustration } from '@/components/StorefrontIllustration';
import { ErrorState } from '@/components/ErrorState';
import { OrderCard } from '@/features/orders/OrderCard';
import { OrderSupportSheet } from '@/features/orders/OrderSupportSheet';
import { useOrderHistory } from '@/hooks/useOrders';
import { useRestaurant } from '@/hooks/useRestaurant';
import { printKot } from '@/features/orders/kot';
import { speakOrder } from '@/features/orders/voice';
import type { Order } from '@/types/order';

/**
 * Order history. The paginated list that used to live behind the History tab on
 * the Orders page is now its own bottom-nav destination (Phase 3, Step 1). It
 * reuses `useOrderHistory`, the "Load older orders" button and the
 * "Showing N of M" summary; the rows are read-only (finished orders), so the
 * status actions are not offered.
 */
export function OrderHistoryPage() {
  const history = useOrderHistory(true);
  const restaurant = useRestaurant();
  const [supportOrder, setSupportOrder] = useState<Order | null>(null);

  const rows = useMemo(
    () => (history.data?.pages ?? []).flatMap((p) => p.rows),
    [history.data],
  );
  const total = history.data?.pages?.[0]?.totalOrders ?? rows.length;

  function handleKot(order: Order) {
    const ok = printKot(order, restaurant.data?.name ?? '');
    if (!ok) toast.error('Printing is not available on this device.');
  }

  function handleSpeak(order: Order) {
    const result = speakOrder(order);
    if (result === 'unsupported') toast.error('Voice readout is not supported on this device.');
    else if (result === 'no-voice')
      toast.error('No installed voice for English, Bengali or Hindi. Using the system default.');
  }

  const noop = () => undefined;

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Order history</h1>

      {history.isLoading ? (
        <div className="-mx-4 flex flex-col gap-2" role="status" aria-label="Loading history">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse bg-card motion-reduce:animate-none" />
          ))}
        </div>
      ) : history.isError ? (
        <ErrorState
          message={history.error instanceof Error ? history.error.message : undefined}
          onRetry={() => void history.refetch()}
          retrying={history.isFetching}
        />
      ) : rows.length ? (
        <>
          <p className="text-xs font-semibold text-ink-soft">
            Showing {rows.length} of {total} orders
          </p>
          <div className="-mx-4 flex flex-col gap-2">
            {rows.map((o) => (
              <OrderCard
                key={o._id}
                order={o}
                deliveryMode={restaurant.data?.deliveryMode}
                hideFooter
                onAccept={noop}
                onReject={noop}
                onAdvance={noop}
                onReady={noop}
                onExtendPrep={noop}
                onVerifyOtp={noop}
                onKot={handleKot}
                onSpeak={handleSpeak}
                onSupport={setSupportOrder}
              />
            ))}
          </div>
          {history.hasNextPage ? (
            <button
              type="button"
              onClick={() => void history.fetchNextPage()}
              disabled={history.isFetchingNextPage}
              className="min-h-tap w-full rounded-btn border border-border bg-card text-sm font-semibold text-ink disabled:opacity-60"
            >
              {history.isFetchingNextPage ? 'Loading…' : 'Load older orders'}
            </button>
          ) : null}
        </>
      ) : (
        <EmptyState
          title="No past orders"
          description="Delivered and cancelled orders appear here."
          illustration={<StorefrontIllustration variant="neutral" />}
        />
      )}

      {supportOrder ? (
        <OrderSupportSheet
          order={supportOrder}
          vendorName={restaurant.data?.name ?? ''}
          onClose={() => setSupportOrder(null)}
        />
      ) : null}
    </section>
  );
}
