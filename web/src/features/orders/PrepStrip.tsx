import { Timer } from 'lucide-react';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/cn';
import { prepDeadlineOf, prepStartedAtOf } from './orderDomain';
import { caps } from '@/lib/caps';
import type { Order } from '@/types/order';

function mmss(ms: number): string {
  const secs = Math.ceil(ms / 1000);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

/**
 * Prep countdown strip. The deadline is a persisted server timestamp
 * (estimatedReadyAt / prepReadyAt / readyAt); the ticking clock never writes
 * back, so a reload restores the true remaining time. Mirrors the legacy
 * `prepStripHtml` + `startPrepTimer` pair, including the one-time +5 min
 * extension chip (only while the kitchen is preparing).
 */
export function PrepStrip({
  order,
  extended,
  onExtend,
  busy,
}: {
  order: Order;
  extended: boolean;
  onExtend: (order: Order) => void;
  busy: boolean;
}) {
  const deadline = prepDeadlineOf(order);
  const active = caps.prepCountdown && deadline !== null && (order.status === 'confirmed' || order.status === 'preparing');
  const now = useNow(1000, active);

  if (!active || deadline === null) return null;

  const started = prepStartedAtOf(order);
  const remaining = deadline - now;
  const overdue = remaining <= 0;
  const dueSoon = !overdue && remaining <= 3 * 60 * 1000;
  const pct =
    started !== null && deadline > started
      ? Math.max(0, Math.min(100, ((now - started) / (deadline - started)) * 100))
      : 0;

  const isExtended = extended || order.prepTimeExtended === true;

  return (
    <div
      className={cn(
        'mt-3 flex items-center gap-3 rounded-btn border px-3 py-2',
        overdue ? 'border-danger/40 bg-danger-bg' : dueSoon ? 'border-warning/40 bg-warning-bg' : 'border-border bg-canvas',
      )}
    >
      <span
        className={cn(
          'flex items-center gap-1 text-sm font-extrabold tabular-nums',
          overdue ? 'text-danger' : dueSoon ? 'text-warning' : 'text-ink',
        )}
        aria-live="off"
      >
        <Timer className="h-4 w-4" aria-hidden="true" />
        {overdue ? '0:00' : mmss(remaining)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-ink">
          {overdue ? 'Prep time overdue' : 'Preparing'}
        </span>
        <span className="block text-[11px] text-ink-soft">
          {overdue
            ? 'Mark the order ready as soon as the food is packed.'
            : `Ready in about ${Math.max(1, Math.round(Math.ceil(remaining / 1000) / 60))} min`}
        </span>
        <span className="mt-1 block h-1 w-full overflow-hidden rounded-pill bg-border-soft">
          <i
            className={cn('block h-full', overdue ? 'bg-danger' : dueSoon ? 'bg-warning' : 'bg-brand')}
            style={{ width: `${pct}%` }}
          />
        </span>
      </span>
      {order.status === 'preparing' ? (
        <button
          type="button"
          onClick={() => onExtend(order)}
          disabled={isExtended || busy}
          className={cn(
            'shrink-0 rounded-btn border px-2.5 py-1 text-[11px] font-bold disabled:opacity-60',
            isExtended ? 'border-border text-ink-faint' : 'border-brand text-brand',
          )}
        >
          {isExtended ? '+5 min added' : '+5 min'}
        </button>
      ) : null}
    </div>
  );
}
