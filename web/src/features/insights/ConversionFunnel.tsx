import { InfoTip } from '@/components/InfoTip';
import { formatCount } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { FunnelRow } from './analyticsDomain';

/**
 * Conversion funnel. Each step shows the backend's count and a proportional bar
 * (presentation geometry only). No drop-off percentage is shown because the
 * backend does not return one — the UI must not invent a rate.
 */
export function ConversionFunnel({ rows }: { rows: FunnelRow[] }) {
  const allZero = rows.every((r) => !r.value);

  return (
    <section className="rounded-card border border-border bg-card p-4">
      <h2 className="text-sm font-bold text-ink">Conversion funnel</h2>
      {allZero ? (
        <p className="mt-2 text-xs text-ink-soft" role="status">
          Not enough data yet — customer menu events are not being recorded.
        </p>
      ) : (
        <ol className="mt-3 space-y-3">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1 text-xs font-semibold text-ink-soft">
                  <span className="truncate">{row.label}</span>
                  <InfoTip label={row.label} text={row.formula} />
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
                  {row.value === null ? '—' : formatCount(row.value)}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-pill bg-border-soft">
                <div
                  className={cn('h-full origin-left rounded-pill bg-info motion-safe:transition-transform')}
                  style={{ width: `${Math.max(row.widthPct, row.value ? 4 : 0)}%` }}
                  aria-hidden="true"
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
