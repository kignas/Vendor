import { RefreshCw } from 'lucide-react';
import { ScrollTabs } from '@/components/ScrollTabs';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import type { AnalyticsPeriod } from '@/services/api/analytics';

const PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
];

/**
 * Page header: title, restaurant name, the period presets, a "last updated"
 * stamp and a refresh button. The refresh button is disabled while a fetch is
 * in flight so it cannot spam the API.
 *
 * A true "Custom" range is not offered because the vendor visit route ignores
 * `from`/`to` (open question Q28); offering it would show another period's data
 * under a custom label.
 */
export function AnalyticsHeader({
  restaurantName,
  period,
  onPeriodChange,
  updatedAt,
  onRefresh,
  refreshing,
}: {
  restaurantName: string | null;
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  /** Epoch ms of the last successful fetch, or null. */
  updatedAt: number | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <header className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold text-ink">Analytics</h1>
          {restaurantName ? (
            <p className="truncate text-xs text-ink-soft">{restaurantName}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh analytics"
          className={cn(
            'flex min-h-tap shrink-0 items-center gap-1.5 rounded-btn border border-border bg-card px-3 text-xs font-semibold text-ink transition-colors',
            'hover:bg-border-soft disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', refreshing && 'animate-spin motion-reduce:animate-none')}
            aria-hidden="true"
          />
          Refresh
        </button>
      </div>

      <ScrollTabs activeKey={period} label="Analytics period" className="gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            data-active={period === p.id}
            aria-selected={period === p.id}
            onClick={() => onPeriodChange(p.id)}
            className={cn(
              'min-h-tap shrink-0 rounded-pill px-3 text-sm font-semibold transition-colors',
              period === p.id
                ? 'border border-brand-ink bg-brand/10 text-brand-ink'
                : 'bg-border-soft text-ink-soft',
            )}
          >
            {p.label}
          </button>
        ))}
      </ScrollTabs>

      {updatedAt ? (
        <p className="text-[11px] text-ink-soft" aria-live="polite">
          Last updated {timeAgo(new Date(updatedAt))}
        </p>
      ) : null}
    </header>
  );
}
