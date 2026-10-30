import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /**
   * Custom artwork shown instead of the icon badge (e.g. the storefront
   * illustration). Takes precedence over `icon` when both are given.
   */
  illustration?: React.ReactNode;
  /** Optional primary action (e.g. "Refresh"). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Real empty state — used when a request succeeded but returned nothing.
 * Never confused with loading (skeleton) or error (ErrorState).
 */
export function EmptyState({
  title,
  description,
  icon: Icon,
  illustration,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-card px-6 py-10 text-center',
        className,
      )}
      role="status"
    >
      {illustration ? (
        <span className="mb-3">{illustration}</span>
      ) : Icon ? (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-pill bg-border-soft">
          <Icon className="h-6 w-6 text-ink-soft" aria-hidden="true" />
        </span>
      ) : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-xs text-xs text-ink-soft">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
