import { cn } from '@/lib/cn';

export interface OrderChip {
  id: string;
  label: string;
  count: number;
}

/**
 * The Orders group chips (Phase 3, Step 3). Outlined pills — Preparing, Ready,
 * Picked up (and Scheduled only when it has orders) — each showing its count,
 * with the active one in the brand crimson outline. These only change which
 * existing order group is shown; the server status strings themselves are never
 * renamed or remapped (AGENTS.md rule 3).
 */
export function OrderChips({
  chips,
  active,
  onSelect,
}: {
  chips: OrderChip[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div role="tablist" aria-label="Order groups" className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const isActive = chip.id === active;
        return (
          <button
            key={chip.id}
            type="button"
            role="tab"
            data-active={isActive}
            aria-selected={isActive}
            onClick={() => onSelect(chip.id)}
            className={cn(
              'press inline-flex min-h-tap shrink-0 items-center rounded-pill border px-3.5 text-sm font-semibold transition-colors',
              isActive
                ? 'border-brand-ink bg-brand/5 text-brand-ink'
                : 'border-border text-ink-soft hover:text-ink',
            )}
          >
            {chip.label} ({chip.count})
          </button>
        );
      })}
    </div>
  );
}
