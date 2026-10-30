import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { pushOverlay } from '@/app/overlayStack';
import { cn } from '@/lib/cn';

/**
 * Lightweight bottom sheet used for order actions. Mirrors the legacy sheet
 * markup (backdrop button + slide-up panel) and keeps a 44px+ close target.
 * Registered with the overlay back-stack so the Android back gesture closes it.
 *
 * It renders through a portal to `document.body`. This matters: the sheet is
 * opened from inside the routed page, which lives under `PageTransition` — an
 * element that animates `opacity`, and an animating element creates a stacking
 * context. A `z-50` sheet nested inside it was therefore trapped below the
 * root-level `z-30` bottom nav, which painted over the sheet's footer and hid
 * the Accept/Reject buttons on a real phone. Portalling to `body` puts the
 * sheet in the root stacking context, above the nav, nudge, new-order bar and
 * help bubble.
 *
 * Layout is a flex column capped at 92dvh: `header` is pinned, the children
 * area scrolls, and an optional `footer` (rendered via the `footer` prop) stays
 * put at the bottom with a solid background and a top border.
 */
export function Sheet({
  title,
  description,
  onClose,
  children,
  header,
  footer,
  hideHeader = false,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Pinned, full-bleed block above the scrolling body (e.g. a colour band). */
  header?: React.ReactNode;
  /** Optional pinned footer (actions) that never scrolls out of view. */
  footer?: React.ReactNode;
  /** Suppress the built-in heading; the caller renders its own (e.g. a colour band). */
  hideHeader?: boolean;
}) {
  useEffect(() => pushOverlay(onClose), [onClose]);

  const sheet = (
    <div
      className="fixed inset-0 z-50 flex items-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-scrim/60"
      />
      <div className="app-column relative z-10 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-card bg-card animate-slide-up">
        {header ? <div className="shrink-0">{header}</div> : null}
        <div
          data-testid="sheet-scroll"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
        >
          <div className={cn('p-5', !footer && 'safe-bottom')}>
            {hideHeader ? null : <h2 className="text-base font-bold text-ink">{title}</h2>}
            {!hideHeader && description ? (
              <p className="mt-1 text-xs text-ink-soft">{description}</p>
            ) : null}
            <div className={hideHeader ? '' : 'mt-3'}>{children}</div>
          </div>
        </div>
        {footer ? (
          <div
            data-testid="sheet-footer"
            className="shrink-0 border-t border-border bg-card px-5 pt-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return sheet;
  return createPortal(sheet, document.body);
}
