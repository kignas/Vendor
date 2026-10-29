import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';

/**
 * Animates the routed page in on navigation. Keyed by pathname so each route
 * change replays a short fade. Deliberately CSS-only (no animation library): it
 * must never delay order actions, and reduced-motion collapses it to an instant
 * swap via the global media rule.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="animate-fade-in">
      {children}
    </div>
  );
}

/**
 * One-shot "arrived" pulse for a new-order card. Remounts when `trigger`
 * changes so the pulse plays once, then stops (no continuous animation while
 * the order waits).
 */
export function ArrivalPulse({
  trigger,
  className,
  children,
}: {
  trigger: string | number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      key={String(trigger)}
      className={cn('animate-attention-pulse motion-reduce:animate-none', className)}
    >
      {children}
    </div>
  );
}
