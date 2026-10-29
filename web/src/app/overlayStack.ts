/**
 * Overlay back-stack. Sheets and dialogs register a close callback while they
 * are open; the Android hardware back handler consults this first so a back
 * gesture dismisses the top-most overlay instead of leaving the screen.
 *
 * Kept as a plain module (not React state) so registration never triggers a
 * re-render and so non-React callers can participate.
 */
type CloseFn = () => void;

const stack: CloseFn[] = [];

/** Register an open overlay. Returns an unregister function for cleanup. */
export function pushOverlay(close: CloseFn): () => void {
  stack.push(close);
  return () => {
    const i = stack.lastIndexOf(close);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** Close the top-most overlay. Returns false when nothing was open. */
export function closeTopOverlay(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  // The overlay's own effect unregisters it once it actually closes.
  top();
  return true;
}

export function overlayCount(): number {
  return stack.length;
}

/** Clear the stack. Used by tests and on hard route resets. */
export function resetOverlays(): void {
  stack.length = 0;
}
