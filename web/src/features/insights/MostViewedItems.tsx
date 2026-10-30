import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { InfoTip } from '@/components/InfoTip';
import { formatCount } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { ItemRow } from './analyticsDomain';

type SortKey = 'name' | 'views' | 'addToCart' | 'engagement';

const COLUMNS: { key: SortKey; label: string; numeric: boolean; tip?: string }[] = [
  { key: 'name', label: 'Item', numeric: false },
  { key: 'views', label: 'Views', numeric: true, tip: 'Item opens (item_view events) in the period.' },
  { key: 'addToCart', label: 'Add to cart', numeric: true, tip: 'Times this item was added to a cart.' },
  {
    key: 'engagement',
    label: 'Engagement',
    numeric: true,
    tip: 'Item engagement = add-to-cart events ÷ item views × 100.',
  },
];

function sortValue(row: ItemRow, key: SortKey): number | string {
  switch (key) {
    case 'name':
      return row.name.toLowerCase();
    case 'views':
      return row.views ?? -1;
    case 'addToCart':
      return row.addToCart ?? -1;
    case 'engagement':
      return row.engagement ?? -1;
  }
}

/**
 * Most-viewed menu items. Sortable by any column; a small inline bar shows
 * views relative to the most-viewed item (presentation only). Every number
 * (views, add-to-cart, engagement %) is the backend's value; engagement is never
 * recomputed here.
 *
 * Responsive: a real table on wide screens; on small screens each row collapses
 * into a stacked card via a `data-label` attribute pattern so the numbers stay
 * readable without horizontal scrolling.
 */
export function MostViewedItems({ items }: { items: ItemRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('views');
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const rows = [...items];
    rows.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    return rows;
  }, [items, sortKey, asc]);

  const maxViews = useMemo(() => Math.max(1, ...items.map((i) => i.views ?? 0)), [items]);

  function toggle(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === 'name');
    }
  }

  return (
    <section className="rounded-card border border-border bg-card p-4">
      <h2 className="text-sm font-bold text-ink">Most-viewed items</h2>
      {sorted.length === 0 ? (
        <p className="mt-2 text-xs text-ink-soft" role="status">
          No item views recorded for this period.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {COLUMNS.map((col) => {
                  const active = col.key === sortKey;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={active ? (asc ? 'ascending' : 'descending') : 'none'}
                      className={cn('py-2 text-left', col.numeric && 'text-right')}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(col.key)}
                        className={cn(
                          'inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide',
                          col.numeric && 'flex-row-reverse',
                          active ? 'text-ink' : 'text-ink-soft',
                        )}
                      >
                        {col.label}
                        {active ? (
                          asc ? (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          )
                        ) : null}
                        {col.tip ? <InfoTip label={col.label} text={col.tip} /> : null}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id} className="border-b border-border-soft last:border-0">
                  <th scope="row" className="max-w-[9rem] py-2 pr-2 text-left font-medium text-ink">
                    <span className="line-clamp-1">{row.name}</span>
                  </th>
                  <td className="py-2 text-right tabular-nums text-ink">
                    <span className="font-semibold">{row.views === null ? '—' : formatCount(row.views)}</span>
                    <span
                      className="mt-1 block h-1 w-16 origin-right rounded-pill bg-brand-ink/50"
                      style={{ width: `${row.views ? Math.max(8, Math.round(((row.views ?? 0) / maxViews) * 64)) : 0}px` }}
                      aria-hidden="true"
                    />
                  </td>
                  <td className="py-2 text-right tabular-nums text-ink-soft">
                    {row.addToCart === null ? '—' : formatCount(row.addToCart)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-ink-soft">
                    {row.engagement === null ? '—' : `${row.engagement}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
