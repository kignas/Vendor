import { useSyncExternalStore } from 'react';
import { overlayCount, subscribeOverlays } from '@/app/overlayStack';

/**
 * Whether any sheet or dialog is currently open. Subscribes to the overlay
 * back-stack so a component can react to overlays opened anywhere in the app
 * (the stack is a plain module, not React state).
 */
export function useOverlayOpen(): boolean {
  return useSyncExternalStore(
    subscribeOverlays,
    () => overlayCount() > 0,
    () => false,
  );
}
