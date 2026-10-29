import { Monitor, Moon, Sun } from 'lucide-react';
import { useUiStore, type ThemePreference } from '@/app/uiStore';
import { cn } from '@/lib/cn';

const OPTIONS: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
];

/**
 * Three-way appearance selector (System / Light / Dark). Shared by Settings and
 * the More hub so both stay in step with the persisted preference.
 */
export function ThemeControl() {
  const preference = useUiStore((s) => s.themePreference);
  const setPreference = useUiStore((s) => s.setThemePreference);

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="grid grid-cols-3 gap-1 rounded-btn bg-border-soft p-1"
    >
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = preference === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(id)}
            className={cn(
              'flex min-h-tap items-center justify-center gap-1.5 rounded-[8px] text-xs font-semibold transition-colors',
              active ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
            )}
          >
            <Icon className={cn('h-4 w-4', active && 'text-brand-ink')} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
