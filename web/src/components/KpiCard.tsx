import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Skeleton } from './Skeletons';
import { cn } from '@/lib/cn';

export interface KpiCardProps {
  label: string;
  /** Pre-formatted value (callers use `formatMoney`). `null` renders an em dash. */
  value: string | null;
  /** Optional delta, e.g. `+12%`. Sign decides the arrow + tone. */
  delta?: string | null;
  /** Show the loading skeleton instead of a value. */
  loading?: boolean;
  /** Optional helper line under the value. */
  hint?: string;
  className?: string;
}

/**
 * KPI card. Loading shows a skeleton, never a placeholder number
 * (AGENTS.md rule 5). A `null` value is an explicit "no data" em dash.
 */
export function KpiCard({ label, value, delta, loading = false, hint, className }: KpiCardProps) {
  const deltaPositive = typeof delta === 'string' && delta.trim().startsWith('+');
  const deltaNegative = typeof delta === 'string' && delta.trim().startsWith('-');

  if (loading) {
    return (
      <div
        className={cn('rounded-card border border-border bg-card p-4', className)}
        role="status"
        aria-label={`Loading ${label}`}
      >
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-6 w-28" />
      </div>
    );
  }

  return (
    <div className={cn('rounded-card border border-border bg-card p-4', className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-ink">{value ?? '—'}</p>
      <div className="mt-1 flex items-center gap-2">
        {delta ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums',
              deltaPositive && 'text-success',
              deltaNegative && 'text-danger',
              !deltaPositive && !deltaNegative && 'text-ink-soft',
            )}
          >
            {deltaPositive ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            {deltaNegative ? <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            {delta}
          </span>
        ) : null}
        {hint ? <span className="text-xs text-ink-faint">{hint}</span> : null}
      </div>
    </div>
  );
}
