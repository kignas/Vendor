import { cn } from '@/lib/cn';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
}

/**
 * Pill segmented control used to switch between two closely related views
 * (Menu | Stock, Insights | Finance). Buttons carry `aria-pressed` so screen
 * readers announce the selected segment; the active segment is a filled
 * monochrome pill so the state reads without relying on colour alone.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible group label. */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex gap-1 rounded-pill bg-border-soft p-1', className)}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              'min-h-tap flex-1 rounded-pill text-sm font-semibold transition-colors',
              active ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
