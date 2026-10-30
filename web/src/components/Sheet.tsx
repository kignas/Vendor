import { useEffect } from 'react';
import { pushOverlay } from '@/app/overlayStack';

/**
 * Lightweight bottom sheet used for order actions. Mirrors the legacy sheet
 * markup (backdrop button + slide-up panel) and keeps a 44px+ close target.
 * Registered with the overlay back-stack so the Android back gesture closes it.
 */
export function Sheet({
  title,
  description,
  onClose,
  children,
  hideHeader = false,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Suppress the built-in heading; the caller renders its own (e.g. a colour band). */
  hideHeader?: boolean;
}) {
  useEffect(() => pushOverlay(onClose), [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-scrim/60"
      />
      <div className="app-column safe-bottom relative z-10 rounded-t-card bg-card p-5 animate-slide-up">
        {hideHeader ? null : <h2 className="text-base font-bold text-ink">{title}</h2>}
        {!hideHeader && description ? (
          <p className="mt-1 text-xs text-ink-soft">{description}</p>
        ) : null}
        <div className={hideHeader ? '' : 'mt-3'}>{children}</div>
      </div>
    </div>
  );
}
