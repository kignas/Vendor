import { useCallback, useEffect, useState } from 'react';

/** Local-only kitchen preference, matching the legacy key exactly. */
const RUSH_KEY = 'eatswada_vendor_rush_mode';

function read(): boolean {
  try {
    return window.localStorage.getItem(RUSH_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Kitchen Rush Mode: a local preference that adds +5 minutes to the default
 * KPT the vendor sees in the accept sheet. It never silently changes a KPT that
 * was already committed to the customer, and it is never sent to the backend.
 * Mirrors the legacy `setRushMode` / `defaultPrepMinutes` pair.
 */
export function useRushMode() {
  const [rush, setRush] = useState(read);

  useEffect(() => {
    setRush(read());
  }, []);

  const set = useCallback((on: boolean) => {
    setRush(on);
    try {
      window.localStorage.setItem(RUSH_KEY, on ? '1' : '0');
    } catch {
      /* storage may be disabled */
    }
  }, []);

  /** Default prep minutes offered in the accept sheet: 20, or 25 in rush mode. */
  const defaultPrepMinutes = rush ? 25 : 20;

  return { rush, setRushMode: set, defaultPrepMinutes };
}
