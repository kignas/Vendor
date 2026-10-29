import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

/**
 * Horizontally scrollable tab strip. Long tab lists stay fully reachable by
 * deliberate swipe, the scrollbar is hidden (a mobile pattern), and the active
 * tab is scrolled into view whenever it changes so it is never off-screen.
 */
export function ScrollTabs({
  activeKey,
  label,
  className,
  children,
}: {
  /** Value that changes when the active tab changes (drives scroll-into-view). */
  activeKey: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[data-active="true"]');
    // jsdom (and older webviews) may not implement scrollIntoView.
    if (typeof active?.scrollIntoView === 'function') {
      active.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }, [activeKey]);

  return (
    <div
      ref={ref}
      role="tablist"
      aria-label={label}
      className={cn('no-scrollbar flex gap-1.5 overflow-x-auto pb-1', className)}
    >
      {children}
    </div>
  );
}
