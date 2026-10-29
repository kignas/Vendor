import { Bell, CheckCheck } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonList } from '@/components/Skeletons';
import { useMarkNotificationRead, useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/cn';
import type { AppNotification } from '@/types/notification';

const READ_CACHE_KEY = 'eatswada_vendor_read_notifications';

/** Optimistic local read cache for rows marked on this device. */
function readCache(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_CACHE_KEY) || '[]') as string[]);
  } catch {
    return new Set();
  }
}

function cacheRead(id: string): void {
  try {
    const set = readCache();
    set.add(id);
    localStorage.setItem(READ_CACHE_KEY, JSON.stringify([...set].slice(-300)));
  } catch {
    /* ignore */
  }
}

function notifId(n: AppNotification): string {
  return String(n._id ?? n.id ?? '');
}

/** The server's `readAt` wins; the local set is only an optimistic cache. */
function isRead(n: AppNotification): boolean {
  if (n.readAt) return true;
  return readCache().has(notifId(n));
}

function notifTitle(n: AppNotification): string {
  return n.title || n.data?.title || 'Notification';
}

function notifBody(n: AppNotification): string {
  return n.body || n.message || n.data?.body || '';
}

function whenLabel(iso: string | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Row({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: (n: AppNotification) => void;
}) {
  const read = isRead(notification);
  const id = notifId(notification);

  return (
    <button
      type="button"
      onClick={() => !read && onRead(notification)}
      className="flex w-full items-start gap-3 border-b border-border-soft py-3 text-left last:border-b-0"
      aria-label={read ? undefined : `Mark “${notifTitle(notification)}” as read`}
    >
      <span
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-pill',
          read ? 'bg-transparent' : 'bg-brand',
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <strong className={cn('text-sm', read ? 'font-medium text-ink-soft' : 'font-bold text-ink')}>
            {notifTitle(notification)}
          </strong>
          <span className="whitespace-nowrap text-[11px] text-ink-faint">
            {whenLabel(notification.createdAt)}
          </span>
        </span>
        {notifBody(notification) ? (
          <span className="mt-1 block text-[13px] leading-relaxed text-ink-soft">
            {notifBody(notification)}
          </span>
        ) : null}
      </span>
      {id && !read ? <CheckCheck className="mt-1 h-4 w-4 text-ink-faint" aria-hidden="true" /> : null}
    </button>
  );
}

/**
 * Notifications. Lists the vendor's own rows (GET /notifications). Tapping an
 * unread row marks it read server-side (PATCH /notifications/:id/read) and
 * records it in the local optimistic cache. The bell badge reflects the server
 * read state.
 */
export function NotificationsPage() {
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();

  const rows = notifications.data ?? [];

  function onRead(n: AppNotification) {
    const id = notifId(n);
    if (!id) return;
    cacheRead(id);
    markRead.mutate(id);
  }

  return (
    <section className="space-y-4">
      <h1 className="text-lg font-extrabold text-ink">Notifications</h1>

      {notifications.isLoading ? <SkeletonList rows={4} /> : null}

      {notifications.isError ? (
        <ErrorState
          message="Could not load notifications."
          onRetry={() => void notifications.refetch()}
          retrying={notifications.isFetching}
        />
      ) : null}

      {notifications.isSuccess && rows.length === 0 ? (
        <EmptyState title="No notifications" description="Updates will appear here." icon={Bell} />
      ) : null}

      {rows.length ? (
        <div className="rounded-card border border-border bg-card px-4">
          {rows.map((n, i) => (
            <Row key={notifId(n) || i} notification={n} onRead={onRead} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
