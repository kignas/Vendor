import { useEffect } from 'react';
import { toast } from 'sonner';
import { closeTopOverlay } from '@/app/overlayStack';
import { decideBack } from '@/app/backNavigation';

/** Capacitor App plugin surface we rely on (optional — web has no native shell). */
interface CapacitorAppPlugin {
  addListener?: (
    event: 'backButton',
    cb: () => void,
  ) => Promise<{ remove: () => Promise<void> | void }> | { remove: () => Promise<void> | void };
  exitApp?: () => Promise<void> | void;
  minimizeApp?: () => Promise<void> | void;
}

function capacitorApp(): CapacitorAppPlugin | undefined {
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } })
    .Capacitor;
  return cap?.Plugins?.App as CapacitorAppPlugin | undefined;
}

function isNative(): boolean {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  return !!cap?.isNativePlatform?.();
}

/** True when react-router has in-app history to return to (its own index). */
function hasInAppHistory(): boolean {
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === 'number' && idx > 0;
}

/**
 * Android hardware/system back handling.
 *
 * Hierarchy (Part H): close an open sheet/dialog first, then walk back through
 * in-app history, and only at the root fall back to a two-press exit so a single
 * accidental gesture never closes the app. Listeners are registered once and
 * removed on unmount; the browser `popstate` path mirrors the same policy so web
 * and native behave alike.
 */
export function useBackButton(): void {
  useEffect(() => {
    let exitArmed = false;
    let armTimer: number | undefined;

    const handleBack = (): boolean => {
      const decision = decideBack({
        overlayClosed: closeTopOverlay(),
        hasHistory: hasInAppHistory(),
        exitArmed,
      });

      if (decision === 'overlay') return true;
      if (decision === 'history') {
        window.history.back();
        return true;
      }
      if (decision === 'confirm-exit') {
        exitArmed = true;
        window.clearTimeout(armTimer);
        armTimer = window.setTimeout(() => {
          exitArmed = false;
        }, 2000);
        toast.message('Press back again to exit');
        return true;
      }
      // decision === 'exit'
      exitArmed = false;
      capacitorApp()?.exitApp?.();
      return false;
    };

    let removeNative: (() => void) | undefined;
    let disposed = false;

    if (isNative()) {
      const add = capacitorApp()?.addListener?.('backButton', () => {
        handleBack();
      });
      if (add && typeof (add as Promise<unknown>).then === 'function') {
        void (add as Promise<{ remove: () => Promise<void> | void }>).then((l) => {
          if (disposed) void l.remove();
          else removeNative = () => void l.remove();
        });
      } else if (add) {
        const l = add as { remove: () => Promise<void> | void };
        removeNative = () => void l.remove();
      }
    } else {
      // Web fallback: only intercept when an overlay is open, so normal browser
      // back keeps working. Otherwise let the browser handle history.
      const onPop = (e: PopStateEvent) => {
        if (closeTopOverlay()) {
          e.preventDefault();
          // Re-push so the user stays on the page they were viewing.
          window.history.pushState(window.history.state, '');
        }
      };
      window.addEventListener('popstate', onPop);
      removeNative = () => window.removeEventListener('popstate', onPop);
    }

    return () => {
      disposed = true;
      window.clearTimeout(armTimer);
      removeNative?.();
    };
  }, []);
}
