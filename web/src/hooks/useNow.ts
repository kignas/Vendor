import { useEffect, useState } from 'react';

/**
 * Returns the current epoch time, refreshed on an interval. The interval is
 * cleared on unmount and on tab hide (a backgrounded WebView has no reason to
 * keep ticking), matching the legacy timers' cleanup discipline.
 */
export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);

  return now;
}
