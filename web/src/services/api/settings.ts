/**
 * Operational settings endpoint module. Paths exist in VENDOR-API-CONTRACT.md:
 *   GET /vendor/settings
 *   PUT /vendor/settings  ({ maxActiveOrders?, settlementSchedule? })
 *   GET /vendor/onboarding/config (bounds + allowed schedules; optional)
 */
import { apiFetch } from '@/lib/api';
import type { OnboardingConfig, OperationalSettings, SettingsResponse } from '@/types/settings';

export async function fetchSettings(): Promise<OperationalSettings> {
  const res = await apiFetch<SettingsResponse>('/settings');
  return res?.data ?? (res as unknown as OperationalSettings) ?? {};
}

export async function fetchOnboardingConfig(): Promise<OnboardingConfig | null> {
  try {
    const res = await apiFetch<{ data?: OnboardingConfig }>('/onboarding/config');
    return res?.data ?? null;
  } catch {
    return null;
  }
}

export interface SettingsUpdate {
  maxActiveOrders?: number;
  settlementSchedule?: string;
}

/** PUT /settings — only the vendor-editable fields. */
export function updateSettings(payload: SettingsUpdate): Promise<unknown> {
  return apiFetch('/settings', { method: 'PUT', body: payload });
}
