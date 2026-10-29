/**
 * Notifications endpoint module. Paths exist in VENDOR-API-CONTRACT.md:
 *   GET   /notifications          (own rows, newest first)
 *   PATCH /notifications/:id/read (stamps readAt)
 * The notifications base is `<VITE_API_ORIGIN>/api/notifications`.
 */
import { apiFetch, NOTIFICATIONS_BASE } from '@/lib/api';
import type { AppNotification, NotificationsResponse } from '@/types/notification';

export async function fetchNotifications(): Promise<AppNotification[]> {
  const res = await apiFetch<NotificationsResponse>('', { base: NOTIFICATIONS_BASE });
  return Array.isArray(res?.data) ? res.data : [];
}

/** PATCH /notifications/:id/read — server stamps `readAt`. */
export function markNotificationRead(id: string): Promise<unknown> {
  return apiFetch(`/${id}/read`, { method: 'PATCH', base: NOTIFICATIONS_BASE });
}
