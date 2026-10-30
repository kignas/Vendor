/**
 * Restaurant performance endpoint module (read-only).
 *
 * `GET /vendor/performance` returns the caller's OWN restaurant performance
 * score, its ranking factors and the live availability classification. It is
 * scoped to `req.user.restaurantId` server-side, so the app never sends an id.
 * The vendor cannot edit weights, pins or scores.
 */
import { apiFetch } from '@/lib/api';
import type { PerformanceData, PerformanceResponse } from '@/types/performance';

export async function fetchPerformance(): Promise<PerformanceData | null> {
  const res = await apiFetch<PerformanceResponse>('/performance');
  return res?.data ?? null;
}
