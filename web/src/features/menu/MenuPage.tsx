import { useMemo, useState } from 'react';
import { Plus, Search, UtensilsCrossed } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { StatusPill } from '@/components/StatusPill';
import { BottomSheet } from '@/components/BottomSheet';
import { ScrollTabs } from '@/components/ScrollTabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateMenuItem, useMenu, useToggleStock } from '@/hooks/useMenu';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';
import type { MenuItem } from '@/types/menu';

/** Pending-approval state for an item the admin has not published yet. */
function isPending(item: MenuItem): boolean {
  const raw = String(
    item.approvalStatus ?? item.approval ?? item.menuStatus ?? item.moderationStatus ?? item.status ?? '',
  ).toLowerCase();
  return raw === 'pending' || raw === 'under_review' || raw === 'awaiting_approval';
}

/** A row is low on stock only when it truly tracks quantity below the threshold. */
function isLowStock(item: MenuItem): boolean {
  if (item.trackStock !== true) return false;
  const qty = Number(item.stockQuantity ?? 0);
  const threshold = Number(item.lowStockThreshold ?? 0);
  return qty > 0 && qty <= threshold;
}

function StockBadge({ item }: { item: MenuItem }) {
  if (isPending(item)) return <StatusPill tone="warning">Pending approval</StatusPill>;
  if (item.inStock === false) return <StatusPill tone="danger" dot>Out of stock</StatusPill>;
  if (isLowStock(item)) {
    return <StatusPill tone="warning" dot>Low · {Number(item.stockQuantity)} left</StatusPill>;
  }
  return <StatusPill tone="success" dot>In stock</StatusPill>;
}

const EMPTY_DRAFT = {
  name: '',
  price: '',
  category: '',
  description: '',
  image: '',
  isVeg: false,
  trackStock: false,
  stockQuantity: '',
  lowStockThreshold: '',
};

/** Create-only sheet (POST /menu). The backend marks the item pending approval. */
function CreateItemSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateMenuItem();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof typeof EMPTY_DRAFT>(key: K, value: (typeof EMPTY_DRAFT)[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = 'Item name is required.';
    const price = Number(draft.price);
    if (draft.price.trim() === '' || !Number.isFinite(price) || price < 0) {
      next.price = 'Enter a valid price.';
    }
    if (draft.trackStock) {
      const qty = Number(draft.stockQuantity);
      if (draft.stockQuantity.trim() === '' || !Number.isInteger(qty) || qty < 0) {
        next.stockQuantity = 'Enter a whole number of units.';
      }
      const low = draft.lowStockThreshold;
      if (low.trim() !== '' && (!Number.isInteger(Number(low)) || Number(low) < 0)) {
        next.lowStockThreshold = 'Enter a whole number.';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    const payload = {
      name: draft.name.trim(),
      price: Number(draft.price),
      ...(draft.category.trim() ? { category: draft.category.trim() } : {}),
      ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
      ...(draft.image.trim() ? { image: draft.image.trim() } : {}),
      isVeg: draft.isVeg,
      ...(draft.trackStock
        ? {
            trackStock: true,
            stockQuantity: Number(draft.stockQuantity),
            ...(draft.lowStockThreshold.trim() !== ''
              ? { lowStockThreshold: Number(draft.lowStockThreshold) }
              : {}),
          }
        : {}),
    };
    try {
      await create.mutateAsync(payload);
      toast.success('Item submitted for approval.');
      setDraft(EMPTY_DRAFT);
      setErrors({});
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the item.');
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Add menu item"
      description="New items are reviewed by Eatswada before they go live."
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="mi-name" className="text-xs font-semibold text-ink">
            Item name *
          </label>
          <Input
            id="mi-name"
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            aria-invalid={!!errors.name}
          />
          {errors.name ? <p className="text-xs text-danger-ink">{errors.name}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="mi-price" className="text-xs font-semibold text-ink">
              Price ₹ *
            </label>
            <Input
              id="mi-price"
              type="number"
              inputMode="decimal"
              min={0}
              value={draft.price}
              onChange={(e) => set('price', e.target.value)}
              aria-invalid={!!errors.price}
            />
            {errors.price ? <p className="text-xs text-danger-ink">{errors.price}</p> : null}
          </div>
          <div className="space-y-1">
            <label htmlFor="mi-cat" className="text-xs font-semibold text-ink">
              Category
            </label>
            <Input
              id="mi-cat"
              value={draft.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="e.g. Starters"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="mi-desc" className="text-xs font-semibold text-ink">
            Description
          </label>
          <textarea
            id="mi-desc"
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            className="w-full rounded-btn border border-border bg-card p-3 text-sm text-ink focus-visible:border-brand-ink"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="mi-img" className="text-xs font-semibold text-ink">
            Image URL
          </label>
          <Input id="mi-img" value={draft.image} onChange={(e) => set('image', e.target.value)} />
        </div>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-ink">Vegetarian</span>
          <input
            type="checkbox"
            checked={draft.isVeg}
            onChange={(e) => set('isVeg', e.target.checked)}
            aria-label="Vegetarian"
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-ink">Track stock quantity</span>
          <input
            type="checkbox"
            checked={draft.trackStock}
            onChange={(e) => set('trackStock', e.target.checked)}
            aria-label="Track stock quantity"
          />
        </label>
        {draft.trackStock ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="mi-qty" className="text-xs font-semibold text-ink">
                Units
              </label>
              <Input
                id="mi-qty"
                type="number"
                min={0}
                inputMode="numeric"
                value={draft.stockQuantity}
                onChange={(e) => set('stockQuantity', e.target.value)}
                aria-invalid={!!errors.stockQuantity}
              />
              {errors.stockQuantity ? (
                <p className="text-xs text-danger-ink">{errors.stockQuantity}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label htmlFor="mi-low" className="text-xs font-semibold text-ink">
                Low-stock alert at
              </label>
              <Input
                id="mi-low"
                type="number"
                min={0}
                inputMode="numeric"
                value={draft.lowStockThreshold}
                onChange={(e) => set('lowStockThreshold', e.target.value)}
                aria-invalid={!!errors.lowStockThreshold}
              />
              {errors.lowStockThreshold ? (
                <p className="text-xs text-danger-ink">{errors.lowStockThreshold}</p>
              ) : null}
            </div>
          </div>
        ) : null}
        <Button variant="brand" onClick={() => void submit()} disabled={create.isPending} className="w-full">
          {create.isPending ? 'Submitting…' : 'Submit for approval'}
        </Button>
      </div>
    </BottomSheet>
  );
}

/**
 * Menu + stock. Only mounted routes are used: GET /menu, POST /menu (create),
 * and PUT /menu/:id/toggle-stock. Edit/Delete are withheld because the backend
 * has no mounted route (BACKEND-GAPS.md §1/§2) — the UI states the gap rather
 * than offering a control that can only 404.
 */
export function MenuPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const menu = useMenu();
  const toggle = useToggleStock();

  const items = menu.data ?? [];

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const i of menu.data ?? []) if (i.category) set.add(String(i.category));
    return ['all', ...Array.from(set).sort()];
  }, [menu.data]);

  const q = query.trim().toLowerCase();
  const filtered = items.filter((i) => {
    if (category !== 'all' && String(i.category ?? '') !== category) return false;
    if (!q) return true;
    return (
      String(i.name || '').toLowerCase().includes(q) ||
      String(i.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-extrabold text-ink">Menu</h1>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-brand-ink"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add item
        </button>
      </div>

      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items or categories"
          className="min-h-tap w-full rounded-btn border border-border bg-card pl-9 pr-3 text-sm text-ink focus:border-brand-ink"
          aria-label="Search menu"
        />
      </label>

      {categories.length > 2 ? (
        <ScrollTabs activeKey={category} label="Menu categories" className="-mx-4 gap-2 px-4">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              data-active={category === c}
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                'min-h-tap min-w-tap shrink-0 rounded-pill px-3 text-sm font-semibold transition-colors',
                category === c ? 'bg-brand text-white' : 'bg-border-soft text-ink-soft',
              )}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </ScrollTabs>
      ) : null}

      <p className="rounded-btn bg-info-bg px-3 py-2 text-xs text-info-ink">
        Editing or deleting an item needs backend routes that are not mounted yet. You can add items
        and toggle stock here.
      </p>

      {menu.isLoading ? (
        <div className="space-y-2" role="status" aria-label="Loading menu">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-card motion-reduce:animate-none" />
          ))}
        </div>
      ) : menu.isError ? (
        <ErrorState
          message={menu.error instanceof Error ? menu.error.message : undefined}
          onRetry={() => void menu.refetch()}
          retrying={menu.isFetching}
        />
      ) : filtered.length ? (
        <ul className="space-y-2">
          {filtered.map((item) => {
            const pending = isPending(item);
            return (
              <li
                key={item._id}
                className="flex items-center gap-3 rounded-card border border-border bg-card p-3"
              >
                {item.image ? (
                  <img
                    src={String(item.image)}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-btn object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                    }}
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{item.name}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {item.category || 'General'}
                    {item.price !== undefined ? ` · ${formatMoney(item.price)}` : ''}
                  </p>
                  <div className="mt-1">
                    <StockBadge item={item} />
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.inStock === true}
                  aria-label={`${item.name} ${item.inStock ? 'in stock' : 'out of stock'}`}
                  disabled={pending || (toggle.isPending && toggle.variables?.id === item._id)}
                  onClick={() => {
                    toggle.mutate(
                      { id: item._id, inStock: !item.inStock },
                      {
                        onError: (err) =>
                          toast.error(
                            err instanceof Error ? err.message : 'Could not update stock.',
                          ),
                      },
                    );
                  }}
                  className="inline-flex h-11 w-12 shrink-0 items-center disabled:opacity-60"
                >
                  {/* The track stays 28px tall for the iOS-like look; the button
                      keeps a 44px hit area (AGENTS.md tap-target rule). */}
                  <span
                    className={cn(
                      'relative h-7 w-12 rounded-pill transition-colors',
                      item.inStock ? 'bg-success' : 'bg-border',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-6 w-6 rounded-pill bg-white shadow transition-all',
                        item.inStock ? 'left-5' : 'left-0.5',
                      )}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title={query || category !== 'all' ? 'No matches' : 'No menu items yet'}
          description={
            query || category !== 'all'
              ? 'No items match the current search or filter.'
              : 'Add your first item to start selling.'
          }
          icon={UtensilsCrossed}
          action={
            query || category !== 'all' ? undefined : (
              <Button variant="brand" onClick={() => setCreateOpen(true)}>
                Add item
              </Button>
            )
          }
        />
      )}

      <CreateItemSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </section>
  );
}
