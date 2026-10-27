import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

/**
 * Shimmer skeleton block. Loading states use this — never a fake number
 * (AGENTS.md rule 5). `aria-hidden` because the surrounding region announces
 * its own busy state.
 */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn('relative overflow-hidden rounded-btn bg-border-soft', className)}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent motion-reduce:animate-none" />
    </div>
  );
}

/** A card-shaped skeleton: title line + value line. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-card border border-border bg-card p-4', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-6 w-32" />
    </div>
  );
}

/** A list-row skeleton, repeated `rows` times. */
export function SkeletonList({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-card border border-border bg-card p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** A chart-shaped skeleton (bars) for ChartCard loading. */
export function SkeletonChart({ className }: { className?: string }) {
  const heights = ['40%', '65%', '30%', '80%', '55%', '70%'];
  return (
    <div
      className={cn('flex h-40 items-end gap-2', className)}
      role="status"
      aria-label="Loading chart"
    >
      {heights.map((h, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: h }} />
      ))}
    </div>
  );
}
