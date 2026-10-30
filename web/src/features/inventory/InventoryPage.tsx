import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { StorefrontIllustration } from '@/components/StorefrontIllustration';
import { ErrorState } from '@/components/ErrorState';
import { KpiCard } from '@/components/KpiCard';
import { BottomSheet } from '@/components/BottomSheet';
import { SkeletonList } from '@/components/Skeletons';
import { StatusPill } from '@/components/StatusPill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMenu, useToggleStock } from '@/hooks/useMenu';
import {
  useBulkAvailability,
  useCancelRestock,
  useSaveInventory,
  useStockHistory,
} from '@/hooks/useInventory';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';
import type { MenuItem } from '@/types/menu';

function RestockPanel() {
  const menu = useMenu();
  const cancel = useCancelRestock();
  const scheduled = useMemo(() => {
    const items = menu.data ?? [];
    return items.filter((i) => i.autoTurnOnAt && new Date(i.autoTurnOnAt).getTime() > Date.now());
  }, [menu.data]);

  return (
    <div className="rounded-card border border-border bg-card p-4">
      <p className="text-sm font-bold text-ink">Automatic restocking</p>
      <p className="mt-0.5 text-xs text-ink-soft">
        Turn an item back on later from the Menu tab: switch it off, then pick a delay.
      </p>
      <p className="mt-2 text-xs text-ink-faint">
        Restock times are saved per item on the server (autoTurnOnAt) and applied automatically.
      </p>
      {scheduled.length ? (
        <div className="mt-3 space-y-1">
          {scheduled.slice(0, 6).map((i) => (
            <div
              key={i._id}
              className="flex items-center justify-between gap-2 border-t border-border-soft pt-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{i.name}</p>
                <p className="text-xs text-ink-soft">
                  Back on{' '}
                  {new Date(i.autoTurnOnAt as string).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  cancel.mutate(i._id, {
                    onSuccess: () => toast.success('Automatic restock cancelled.'),
                    onError: (err) =>
                      toast.error(err instanceof Error ? err.message : 'Could not cancel the restock.'),
                  })
                }
                className="min-h-tap rounded-btn border border-border px-3 text-xs font-semibold text-ink"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function InventorySheet({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const history = useStockHistory(item?._id ?? null);
  const save = useSaveInventory();
  const [track, setTrack] = useState(false);
  const [qty, setQty] = useState('0');
  const [low, setLow] = useState('5');
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!item) return;
    setTrack(item.trackStock === true);
    setQty(item.trackStock === true ? String(Number(item.stockQuantity ?? 0)) : '0');
    setLow(item.lowStockThreshold != null ? String(item.lowStockThreshold) : '5');
    setAvailable(item.inStock !== false);
  }, [item]);

  async function submit() {
    if (!item) return;
    const payload: {
      trackStock: boolean;
      manualAvailability: boolean;
      stockQuantity?: number;
      lowStockThreshold?: number;
    } = { trackStock: track, manualAvailability: available };
    if (track) {
      const n = Math.floor(Number(qty) || 0);
      if (n < 0) {
        toast.error('Quantity cannot be negative.');
        return;
      }
      payload.stockQuantity = n;
      const l = Number(low);
      if (Number.isFinite(l) && l >= 0) payload.lowStockThreshold = Math.floor(l);
    }
    try {
      await save.mutateAsync({ id: item._id, payload });
      toast.success('Stock updated.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update stock.');
    }
  }

  return (
    <BottomSheet
      open={item !== null}
      onOpenChange={(o) => !o && onClose()}
      title={item?.name ?? 'Inventory'}
    >
      <div className="space-y-3">
        <p className="text-xs text-ink-soft">
          Update how many units are left. Quantity is enforced by the server when an order is accepted.
        </p>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-ink">Track stock quantity</span>
          <input
            type="checkbox"
            checked={track}
            onChange={(e) => setTrack(e.target.checked)}
            aria-label="Track stock quantity"
          />
        </label>

        <div className="space-y-1">
          <label htmlFor="inv-qty" className="text-xs font-semibold text-ink">
            Units available
          </label>
          <Input
            id="inv-qty"
            type="number"
            min={0}
            inputMode="numeric"
            value={qty}
            disabled={!track}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="inv-low" className="text-xs font-semibold text-ink">
            Low-stock alert at
          </label>
          <Input
            id="inv-low"
            type="number"
            min={0}
            inputMode="numeric"
            value={low}
            disabled={!track}
            onChange={(e) => setLow(e.target.value)}
          />
        </div>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-ink">Available to order</span>
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            aria-label="Available to order"
          />
        </label>

        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-ink-faint">
            Stock history
          </p>
          {history.isLoading ? (
            <p className="text-xs text-ink-faint">Loading stock history…</p>
          ) : (history.data?.length ?? 0) === 0 ? (
            <p className="text-xs text-ink-faint">No stock movements recorded yet.</p>
          ) : (
            <div className="space-y-1">
              {history.data?.map((m, i) => {
                const change = Number(m.change ?? 0);
                const when = m.createdAt
                  ? new Date(m.createdAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                return (
                  <div key={i} className="border-t border-border-soft pt-1.5">
                    <p className="text-sm font-semibold text-ink">
                      {change > 0 ? '+' : ''}
                      {change} → {Number(m.after ?? 0)}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {m.reason || ''}
                      {when ? ` · ${when}` : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Button
          variant="brand"
          onClick={() => void submit()}
          disabled={save.isPending}
          className="w-full"
        >
          {save.isPending ? 'Saving…' : 'Save stock'}
        </Button>
      </div>
    </BottomSheet>
  );
}

/**
 * Inventory. Built on GET /menu, PUT /menu/:id/toggle-stock,
 * PUT /menu/:id/inventory, PUT /menu/availability/bulk and
 * GET /menu/inventory/history. Mirrors the legacy renderInventory panel.
 */
export function InventoryPage() {
  const menu = useMenu();
  const toggle = useToggleStock();
  const bulk = useBulkAvailability();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);

  const items = menu.data ?? [];
  const inStock = items.filter((i) => i.inStock).length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyBulk(makeAvailable: boolean) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    bulk.mutate(
      { ids, inStock: makeAvailable, items },
      {
        onSuccess: () => {
          toast.success(`${ids.length} item${ids.length === 1 ? '' : 's'} updated.`);
          setSelected(new Set());
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Could not update availability.'),
      },
    );
  }

  if (menu.isLoading) {
    return (
      <section className="space-y-4">
        <h1 className="text-lg font-extrabold text-ink">Inventory</h1>
        <SkeletonList rows={4} />
      </section>
    );
  }

  if (menu.isError) {
    return (
      <section className="space-y-4">
        <h1 className="text-lg font-extrabold text-ink">Inventory</h1>
        <ErrorState
          message="Could not load inventory."
          onRetry={() => void menu.refetch()}
          retrying={menu.isFetching}
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Inventory</h1>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="In stock" value={String(inStock)} />
        <KpiCard label="Out of stock" value={String(items.length - inStock)} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No menu items"
          description="Add items in the Menu tab to manage stock."
          illustration={<StorefrontIllustration variant="neutral" />}
        />
      ) : (
        <>
          <div className="rounded-card border border-border bg-card p-4">
            <p className="text-sm font-bold text-ink">Bulk availability</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              Select items, then apply. Uses the server&apos;s bulk availability route.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelected(new Set(items.map((i) => i._id)))}
              >
                Select all
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              <Button
                variant="brand"
                size="sm"
                disabled={selected.size === 0 || bulk.isPending}
                onClick={() => applyBulk(true)}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Mark available
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={selected.size === 0 || bulk.isPending}
                onClick={() => applyBulk(false)}
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Mark unavailable
              </Button>
            </div>
            <p className="mt-2 text-xs text-ink-faint">{selected.size} selected</p>
          </div>

          <RestockPanel />

          <div className="overflow-hidden rounded-card border border-border bg-card">
            {items.map((i, idx) => (
              <div
                key={i._id}
                className={cn(
                  'flex items-center gap-3 p-3',
                  idx < items.length - 1 && 'border-b border-border-soft',
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(i._id)}
                  onChange={() => toggleSelect(i._id)}
                  aria-label={`Select ${i.name}`}
                />
                <button
                  type="button"
                  onClick={() => setOpenItem(i)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-semibold text-ink">{i.name}</p>
                  <p className="text-xs text-ink-soft">
                    {i.category || 'General'} · {formatMoney(i.price)}
                  </p>
                </button>
                <StatusPill tone={i.inStock ? 'success' : 'danger'} dot>
                  {i.inStock ? 'In stock' : 'Out of stock'}
                </StatusPill>
                <button
                  type="button"
                  role="switch"
                  aria-checked={i.inStock !== false}
                  aria-label={`${i.name} availability`}
                  onClick={() =>
                    toggle.mutate(
                      { id: i._id, inStock: !(i.inStock !== false) },
                      {
                        onError: (err) =>
                          toast.error(err instanceof Error ? err.message : 'Could not update stock.'),
                      },
                    )
                  }
                  className={cn(
                    'relative h-7 w-12 shrink-0 rounded-pill transition-colors',
                    i.inStock ? 'bg-success' : 'bg-border',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-6 w-6 rounded-pill bg-white shadow transition-all',
                      i.inStock ? 'left-5' : 'left-0.5',
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <InventorySheet item={openItem} onClose={() => setOpenItem(null)} />
    </section>
  );
}
