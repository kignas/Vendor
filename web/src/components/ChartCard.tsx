import { SkeletonChart } from './Skeletons';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/cn';

export interface ChartCardProps {
  title: string;
  /** Optional right-aligned slot (e.g. a period pill). */
  action?: React.ReactNode;
  loading?: boolean;
  /** True when the series is known to be empty. */
  empty?: boolean;
  emptyLabel?: string;
  /** Chart body. Not required while `loading` or `empty` is set. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Card wrapper for a chart. Owns the loading (skeleton) and empty states so
 * every Recharts usage is consistent and never renders an empty axis.
 */
export function ChartCard({
  title,
  action,
  loading = false,
  empty = false,
  emptyLabel = 'No data for this period.',
  children,
  className,
}: ChartCardProps) {
  return (
    <section className={cn('rounded-card border border-border bg-card p-4', className)}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {action}
      </header>
      {loading ? (
        <SkeletonChart />
      ) : empty ? (
        <EmptyState title={emptyLabel} className="border-0 py-8" />
      ) : (
        children
      )}
    </section>
  );
}
