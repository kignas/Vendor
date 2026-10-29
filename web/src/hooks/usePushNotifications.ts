import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { setupPush } from '@/services/notifications/push';
import { isAuthenticated } from '@/lib/auth';

/**
 * Wires native push once the vendor is authenticated. A foreground push or a
 * tapped notification refreshes the order queue. On the web (non-native) this
 * is a no-op, so it never interferes with the browser experience.
 */
export function usePushNotifications(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated()) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void setupPush().then((fn) => {
      if (cancelled) fn();
      else cleanup = fn;
    });

    const onReceived = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders('queue') });
    };
    window.addEventListener('eatswada:push-received', onReceived);
    window.addEventListener('eatswada:push-opened', onReceived);

    return () => {
      cancelled = true;
      cleanup?.();
      window.removeEventListener('eatswada:push-received', onReceived);
      window.removeEventListener('eatswada:push-opened', onReceived);
    };
  }, [queryClient]);
}
