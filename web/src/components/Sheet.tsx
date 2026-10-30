import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { pushOverlay } from '@/app/overlayStack';
import { cn } from '@/lib/cn';
import { DURATION, EASE_OUT, usePrefersReducedMotion } from '@/lib/motion';

/** Pointer travel (px) past which a header drag dismisses the sheet. */
const DISMISS_DISTANCE = 96;
/** Downward flick velocity (px/s) that also dismisses. */
const DISMISS_VELOCITY = 600;

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
 * area scrolls, and an optional `footer` stays put at the bottom with a solid
 * background and a top border.
 *
 * Motion (Phase 3, Step 11): the panel slides up while the dark backdrop fades
 * in, and both reverse on close. Closing through the sheet's own affordances
 * (backdrop, X, Android back) plays the exit first, then calls `onClose`. The
 * panel can also be dragged down by its header to dismiss - except when
 * `dismissible` is false (the new-order sheet, where a live acceptance window
 * must only be closed with the X). Reduced motion removes the slide entirely
 * and leaves only the backdrop fade.
 */
export function Sheet({
  title,
  description,
  onClose,
  children,
  header,
  footer,
  hideHeader = false,
  dismissible = true,
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
  /** Allow drag-down-to-dismiss on the header (off for the new-order sheet). */
  dismissible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const reduced = usePrefersReducedMotion();
  const closingRef = useRef(false);
  const dragControls = useDragControls();

  // Play the exit animation, then tell the parent to unmount us. Guarded so a
  // second close (backdrop + back button in the same tick) runs once.
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setOpen(false);
  }, []);

  useEffect(() => pushOverlay(requestClose), [requestClose]);

  const dragEnabled = dismissible && !reduced;
  const startDrag = (e: React.PointerEvent) => {
    if (dragEnabled) dragControls.start(e);
  };

  const sheet = (
    <AnimatePresence onExitComplete={onClose}>
      {open ? (
        <motion.div
          key="sheet-root"
          className="fixed inset-0 z-50 flex items-end"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.button
            type="button"
            aria-label="Close"
            onClick={requestClose}
            className="absolute inset-0 bg-scrim/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.sheet, ease: EASE_OUT }}
          />
          <motion.div
            className="app-column relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-card bg-card"
            initial={{ y: reduced ? 0 : 40 }}
            animate={{ y: 0 }}
            exit={{ y: reduced ? 0 : 40 }}
            transition={{ duration: DURATION.sheet, ease: EASE_OUT }}
            drag={dragEnabled ? 'y' : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
                requestClose();
              }
            }}
          >
            {header ? (
              <div className="shrink-0 touch-none" onPointerDown={startDrag}>
                {header}
              </div>
            ) : null}
            <div
              data-testid="sheet-scroll"
              className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
            >
              <div className={cn('p-5', !footer && 'safe-bottom')}>
                {hideHeader ? null : (
                  <div onPointerDown={startDrag} className="touch-none">
                    <h2 className="text-base font-bold text-ink">{title}</h2>
                    {description ? <p className="mt-1 text-xs text-ink-soft">{description}</p> : null}
                  </div>
                )}
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
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return sheet;
  return createPortal(sheet, document.body);
}
