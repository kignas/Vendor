/**
 * Notification types. GET /notifications returns the vendor's own rows
 * (newest first, ≤ 100). Read state is the server's `readAt`; the local set is
 * only an optimistic cache for rows just marked on this device.
 */
export interface AppNotification {
  _id?: string;
  id?: string;
  title?: string;
  body?: string;
  message?: string;
  type?: string;
  createdAt?: string;
  readAt?: string;
  data?: { title?: string; body?: string; [key: string]: unknown };
  [key: string]: unknown;
}

export interface NotificationsResponse {
  data?: AppNotification[];
}
