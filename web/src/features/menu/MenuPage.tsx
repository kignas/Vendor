import { useState } from 'react';
import { UtensilsCrossed, Search } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useMenu, useToggleStock } from '@/hooks/useMenu';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import { toast } from 'sonner';
import type { MenuItem } from '@/types/menu';

/**
 * Menu + stock. Only the mounted routes are used: GET /menu and
 * PUT /menu/:id/toggle-stock. Edit/Delete are withheld because the backend has
 * no mounted route (BACKEND-GAPS.md §1/§2) — the UI states the gap rather than
 * offering a control that can only 404.
 */
export function MenuPage() {
  const [query, setQuery] = useState('');
  const menu = useMenu();
  const toggle = useToggleStock();

  const items = menu.data ?? [];
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (i) =>
          String(i.name || '').toLowerCase().includes(q) ||
          String(i.category || '').toLowerCase().includes(q),
      )
    : items;

  function onToggle(item: MenuItem, inStock: boolean) {
    toggle.mutate(
      { id: item._id, inStock },
      {
        onSuccess: (res) =>
          toast.success(res?.message || (inStock ? 'Marked in stock.' : 'Marked out of stock.')),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update stock.'),
      },
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-ink">Menu</h1>
        {items.length ? <span className="text-sm text-ink-soft">{items.length} items</span> : null}
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items or categories"
          className="min-h-tap w-full rounded-btn border border-border bg-card pl-9 pr-3 text-sm text-ink outline-none focus:border-brand-ink"
          aria-label="Search menu"
        />
      </label>

      <p className="rounded-btn bg-info-bg px-3 py-2 text-xs text-info-ink">
        Editing item details and deleting items need backend routes that are not mounted yet.
        Stock can be toggled here.
      </p>

      {menu.isLoading ? (
        <div className="space-y-2" role="status" aria-label="Loading menu">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-card" />
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
          {filtered.map((item) => (
            <li
              key={item._id}
              className="flex items-center gap-3 rounded-card border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{item.name}</p>
                <p className="truncate text-xs text-ink-soft">
                  {item.category || 'General'}
                  {item.price !== undefined ? ` · ${formatMoney(item.price)}` : ''}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.inStock === true}
                  aria-label={`${item.name} ${item.inStock ? 'in stock' : 'out of stock'}`}
                  disabled={toggle.isPending && toggle.variables?.id === item._id}
                  onClick={() => onToggle(item, !item.inStock)}
                  className={cn(
                    'relative h-7 w-12 shrink-0 rounded-pill transition-colors disabled:opacity-60',
                    item.inStock ? 'bg-success' : 'bg-border',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-6 w-6 rounded-pill bg-white shadow transition-all',
                      item.inStock ? 'left-5' : 'left-0.5',
                    )}
                  />
                </button>
                <span className={cn('text-[11px] font-semibold', item.inStock ? 'text-success-ink' : 'text-ink-faint')}>
                  {item.inStock ? 'In stock' : 'Out of stock'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={query ? 'No matches' : 'No menu items yet'}
          description={query ? `No items match “${query}”.` : 'Add your first item to start selling.'}
          icon={UtensilsCrossed}
        />
      )}
    </section>
  );
}
