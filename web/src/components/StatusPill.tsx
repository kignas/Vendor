import type { VariantProps } from 'class-variance-authority';
import { statusPillVariants } from './statusPillVariants';
import { cn } from '@/lib/cn';

export interface StatusPillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillVariants> {
  /** Optional leading dot for status semantics. */
  dot?: boolean;
}

/**
 * Status pill. Colour is reserved for STATUS only (AGENTS.md design language).
 * The label is rendered raw — order status strings are never renamed.
 */
export function StatusPill({ tone, dot = false, className, children, ...props }: StatusPillProps) {
  return (
    <span className={cn(statusPillVariants({ tone }), className)} {...props}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
