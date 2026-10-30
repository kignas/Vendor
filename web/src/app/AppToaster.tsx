import { Toaster } from 'sonner';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import { useUiStore } from '@/app/uiStore';
import { NAV_FALLBACK, NUDGE_VAR, BAR_VAR } from '@/app/bottomStack';

/**
 * Toast bottom offset: above the bottom nav, the profile nudge and the
 * new-order bar (whose heights are published as CSS variables), plus a little
 * breathing room, so a toast never covers those controls (Phase 3, Step 9).
 */
const TOAST_OFFSET = `calc(var(--es-nav-h, ${NAV_FALLBACK}) + var(${NUDGE_VAR}, 0px) + var(${BAR_VAR}, 0px) + 1rem + env(safe-area-inset-bottom, 0px))`;

/** Leading icon per toast type (Step 9: dark pill with a leading icon). */
const TOAST_ICONS = {
  success: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
  error: <XCircle className="h-4 w-4" aria-hidden="true" />,
  warning: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
  info: <Info className="h-4 w-4" aria-hidden="true" />,
  loading: <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />,
};

/**
 * The app's sonner Toaster, configured once so production and tests render the
 * same dark pill (see `.es-toast` in index.css). Reads the resolved theme so the
 * pill matches light/dark.
 */
export function AppToaster() {
  const theme = useUiStore((s) => s.theme);
  return (
    <Toaster
      position="bottom-center"
      theme={theme}
      offset={TOAST_OFFSET}
      icons={TOAST_ICONS}
      toastOptions={{
        classNames: { toast: 'es-toast' },
        style: { fontFamily: 'Manrope, system-ui, sans-serif' },
      }}
    />
  );
}
