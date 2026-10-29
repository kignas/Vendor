import { useEffect } from 'react';
import { useUiStore } from '@/app/uiStore';
import { useNotifications } from '@/hooks/useNotifications';

const READ_CACHE_KEY = 'eatswada_vendor_read_notifications';

function readCache(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_CACHE_KEY) || '[]') as string[]);
  } catch {
    return new Set();
  }
}

/**
 * Keeps the bell badge in sync with the server read state. A notification is
 * unread when it has no server `readAt` and is not in the local optimistic
 * cache of rows marked on this device — identical to the legacy badge.
 */
export function useUnreadNotifications(): void {
  const notifications = useNotifications();
  const setUnreadCount = useUiStore((s) => s.setUnreadCount);

  useEffect(() => {
    if (!notifications.data) return;
    const read = readCache();
    const unread = notifications.data.filter(
      (n) => !n.readAt && !read.has(String(n._id ?? n.id ?? '')),
    ).length;
    setUnreadCount(unread);
  }, [notifications.data, setUnreadCount]);
}
