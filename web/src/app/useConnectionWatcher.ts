import { useEffect } from 'react';
import { useUiStore } from './uiStore';

/**
 * Keeps the connection pill in sync with the browser's online/offline events.
 * Mirrors the legacy `updateNetworkUi()` wiring.
 */
export function useConnectionWatcher(): void {
  const setConnection = useUiStore((s) => s.setConnection);

  useEffect(() => {
    const update = () => setConnection(navigator.onLine ? 'online' : 'offline');
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, [setConnection]);
}
