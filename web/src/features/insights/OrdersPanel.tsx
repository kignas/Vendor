import { CheckCircle2, RotateCcw, Undo2, XCircle } from 'lucide-react';
import { InfoTip } from '@/components/InfoTip';
import { formatCount, formatMoney } from '@/lib/format';
import type { OrderBreakdown } from './analyticsDomain';

/**
 * Orders panel: completed vs cancelled (plus refunds when the backend sends
 * them) and the revenue generated. Every figure is read from the backend; a
 * missing figure is omitted rather than zero-filled.
 */
export function OrdersPanel({ breakdown }: { breakdown: OrderBreakdown }) {
  const cells: { key: string; label: string; value: number | null; icon: typeof CheckCircle2; tone: string; tip: string }[] = [
    {
      key: 'completed',
      label: 'Completed',
      value: breakdown.completed,
      icon: CheckCircle2,
      tone: 'text-success-ink',
      tip: 'Orders attributed to your menu that completed in the period.',
    },
    {
      key: 'cancelled',
      label: 'Cancelled',
      value: breakdown.cancelled,
      icon: XCircle,
      tone: 'text-danger-ink',
      tip: 'Orders attributed to your menu that were cancelled in the period.',
    },
    {
      key: 'refunds',
      label: 'Refunds',
      value: breakdown.refunds,
      icon: Undo2,
      tone: 'text-warning-ink',
      tip: 'Refunds recorded against your restaurant in the period.',
    },
  ];

  return (
    <section className="rounded-card border border-border bg-card p-4">
      <h2 className="text-sm font-bold text-ink">Orders</h2>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {cells.map((c) => (
          <div key={c.key}>
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              <c.icon className={`h-3.5 w-3.5 ${c.tone}`} aria-hidden="true" />
              {c.label}
              <InfoTip label={c.label} text={c.tip} />
            </p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-ink">
              {c.value === null ? '—' : formatCount(c.value)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 border-t border-border-soft pt-3">
        <RotateCcw className="h-4 w-4 text-brand-ink" aria-hidden="true" />
        <span className="text-xs text-ink-soft">Revenue</span>
        <InfoTip
          label="Revenue"
          text="Delivered order value for your restaurant in the period, calculated by Eatswada."
        />
        <span className="ml-auto text-lg font-extrabold tabular-nums text-ink">
          {breakdown.revenue === null ? '—' : formatMoney(breakdown.revenue)}
        </span>
      </div>
    </section>
  );
}
