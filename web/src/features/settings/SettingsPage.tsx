import { useEffect, useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonCard } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnboardingConfig, useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { enumLabel } from '@/lib/format';
import { toast } from 'sonner';

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border-soft py-2.5 last:border-b-0">
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink-faint">
        {label} · admin-managed
      </p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value || '—'}</p>
    </div>
  );
}

/**
 * Operational settings. GET /vendor/settings drives the read-only rows and the
 * editable form; PUT /vendor/settings sends ONLY { maxActiveOrders,
 * settlementSchedule } — the fields the backend actually accepts. Bounds and
 * the schedule list come from GET /vendor/onboarding/config when available.
 */
export function SettingsPage() {
  const settings = useSettings();
  const config = useOnboardingConfig();
  const update = useUpdateSettings();

  const d = settings.data ?? {};
  const cfg = config.data ?? {};
  const capMin = cfg.maxActiveOrders?.min ?? 1;
  const capMax = cfg.maxActiveOrders?.max ?? 500;
  const schedules =
    Array.isArray(cfg.settlementSchedules) && cfg.settlementSchedules.length
      ? cfg.settlementSchedules
      : ['weekly', 'monthly'];

  const [maxActive, setMaxActive] = useState('');
  const [schedule, setSchedule] = useState('weekly');

  useEffect(() => {
    if (settings.data) {
      setMaxActive(d.maxActiveOrders != null ? String(d.maxActiveOrders) : '');
      setSchedule(String(d.settlementSchedule ?? 'weekly'));
    }
  }, [settings.data, d.maxActiveOrders, d.settlementSchedule]);

  async function save() {
    const payload: { maxActiveOrders?: number; settlementSchedule?: string } = {};
    if (maxActive.trim() !== '') {
      const n = Number(maxActive);
      if (!Number.isInteger(n) || n < capMin || n > capMax) {
        toast.error(`Maximum active orders must be a whole number between ${capMin} and ${capMax}.`);
        return;
      }
      payload.maxActiveOrders = n;
    }
    if (schedule) payload.settlementSchedule = schedule;
    if (Object.keys(payload).length === 0) {
      toast.error('Nothing to save.');
      return;
    }
    try {
      await update.mutateAsync(payload);
      toast.success('Settings saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save settings.');
    }
  }

  if (settings.isError) {
    return (
      <section className="space-y-4">
        <h1 className="text-lg font-extrabold text-ink">Settings</h1>
        <ErrorState
          message="Could not load settings."
          onRetry={() => void settings.refetch()}
          retrying={settings.isFetching}
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Settings</h1>

      {settings.isLoading ? <SkeletonCard /> : null}

      {settings.isSuccess ? (
        <>
          <div className="rounded-card border border-border bg-card px-4 py-1">
            {d.deliveryMode ? (
              <ReadOnlyRow
                label="Delivery mode"
                value={d.deliveryMode === 'self_delivery' ? 'Self delivery' : 'Eatswada delivery'}
              />
            ) : null}
            {d.commissionRate != null ? (
              <ReadOnlyRow label="Commission rate" value={`${d.commissionRate}%`} />
            ) : null}
            {d.commissionPlan ? (
              <ReadOnlyRow label="Commission plan" value={enumLabel(d.commissionPlan)} />
            ) : null}
            {d.activeOrders != null && d.maxActiveOrders != null ? (
              <ReadOnlyRow
                label="Active orders right now"
                value={`${d.activeOrders} of ${d.maxActiveOrders}${
                  d.availableSlots != null ? ` · ${d.availableSlots} free` : ''
                }`}
              />
            ) : null}
          </div>

          <div className="space-y-3 rounded-card border border-border bg-card p-4">
            <div className="space-y-1">
              <label htmlFor="set-max" className="text-xs font-semibold text-ink">
                Maximum active orders
              </label>
              <Input
                id="set-max"
                type="number"
                min={capMin}
                max={capMax}
                step={1}
                inputMode="numeric"
                value={maxActive}
                onChange={(e) => setMaxActive(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="set-schedule" className="text-xs font-semibold text-ink">
                Payout schedule
              </label>
              <select
                id="set-schedule"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="h-11 w-full rounded-btn border border-border bg-card px-3 text-sm text-ink"
              >
                {schedules.map((s) => (
                  <option key={s} value={s}>
                    {enumLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-ink-faint">
              Delivery ownership and commission are set by Eatswada admin.
            </p>
            <Button variant="brand" onClick={() => void save()} disabled={update.isPending}>
              <SettingsIcon className="h-4 w-4" aria-hidden="true" />
              {update.isPending ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
