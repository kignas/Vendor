/**
 * Home dashboard endpoint module. Routes are mounted and contract-tested
 * (`GET /vendor/dashboard`, `/vendor/alerts`); the ported Home page previously
 * used only the earnings summary + queue, so these richer routes went unused.
 * Each unwraps the standard `{ success, data }` envelope and degrades to
 * `null`/`[]` on absence.
 */
import { apiFetch } from '@/lib/api';
import type { AlertsResponse, DashboardResponse, VendorAlert, VendorDashboard } from '@/types/home';

/** GET /vendor/dashboard — compact, vendor-scoped daily summary. */
export async function fetchDashboard(): Promise<VendorDashboard | null> {
  const res = await apiFetch<DashboardResponse>('/dashboard');
  return res?.data ?? null;
}

/** GET /vendor/alerts — menu review, stock and order-action alerts. */
export async function fetchAlerts(): Promise<VendorAlert[]> {
  const res = await apiFetch<AlertsResponse>('/alerts');
  return Array.isArray(res?.data) ? res.data : [];
}
