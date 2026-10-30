import type { LucideIcon } from 'lucide-react';
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
  hint?: string | null;
  /** Optional small leading icon in a tinted badge (Analytics KPIs). */
  icon?: LucideIcon;
  /** Tint for the icon badge. */
  tone?: 'brand' | 'success' | 'info' | 'warning' | 'danger';
  className?: string;
}

const TONE_BG: Record<NonNullable<KpiCardProps['tone']>, string> = {
  brand: 'bg-brand/10 text-brand-ink',
  success: 'bg-success-bg text-success-ink',
  info: 'bg-info-bg text-info-ink',
  warning: 'bg-warning-bg text-warning-ink',
  danger: 'bg-danger-bg text-danger-ink',
};

/**
 * KPI card. Loading shows a skeleton, never a placeholder number
 * (AGENTS.md rule 5). A `null` value is an explicit "no data" em dash.
 */
export function KpiCard({
  label,
  value,
  delta,
  loading = false,
  hint,
  icon: Icon,
  tone = 'brand',
  className,
}: KpiCardProps) {
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
      <div className="flex items-center gap-2">
        {Icon ? (
          <span
            className={cn('flex h-6 w-6 items-center justify-center rounded-pill', TONE_BG[tone])}
            aria-hidden="true"
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      </div>
      <p className="mt-1.5 text-2xl font-extrabold tabular-nums text-ink">{value ?? '—'}</p>
      <div className="mt-1 flex items-center gap-2">
        {delta ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums',
              deltaPositive && 'text-success-ink',
              deltaNegative && 'text-danger-ink',
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
