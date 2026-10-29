import { useEffect, useRef } from 'react';
import { pushOverlay } from '@/app/overlayStack';

/**
 * Register a sheet/dialog with the overlay back-stack while it is open, so the
 * Android back gesture closes it before touching navigation. The latest `close`
 * is kept in a ref so an inline callback does not re-register every render.
 */
export function useOverlayBack(open: boolean, onClose: () => void): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    return pushOverlay(() => closeRef.current());
  }, [open]);
}
