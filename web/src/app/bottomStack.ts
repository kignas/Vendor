import { useEffect, useRef, useState } from 'react';

/**
 * Fixed bottom-stack geometry (Phase 3, Step 7).
 *
 * The bottom nav, the profile nudge and the green new-order bar all sit at the
 * bottom of the screen, stacked in that order. Rather than hard-coding each
 * element's offset (which breaks as soon as a real element is a few pixels
 * taller than the guess), each visible element MEASURES itself and publishes its
 * height into a CSS custom property. Its neighbours read those properties, so a
 * hidden bar removes its property and the elements above collapse with no gap
 * and no overlap.
 *
 * The nav is measured from its inner list (its content height), because the nav
 * itself also carries the bottom safe-area padding, which the offsets add back
 * separately via `env(safe-area-inset-bottom)`.
 */
export const NAV_VAR = '--es-nav-h';
export const NUDGE_VAR = '--es-nudge-h';
export const BAR_VAR = '--es-bar-h';

/** Fallbacks used before the first measurement (and in non-layout test envs). */
const NAV_FALLBACK = '3.6875rem'; // ~59px: py-2 + 24px icon + label
const NUDGE_FALLBACK = '3rem';
const BAR_FALLBACK = '3rem';

const NAV = `var(${NAV_VAR}, ${NAV_FALLBACK})`;
const NUDGE = `var(${NUDGE_VAR}, 0px)`;
const BAR = `var(${BAR_VAR}, 0px)`;
const SAFE = 'env(safe-area-inset-bottom, 0px)';
/** Extra clearance so the floating help bubble never covers a footer button. */
const BUBBLE_CLEARANCE = '4.5rem';

/** Bottom padding the scroll region needs so nothing hides behind the stack. */
export const STACK_PADDING = `calc(${NAV} + ${NUDGE} + ${BAR} + ${BUBBLE_CLEARANCE})`;

/** Bottom offset for the new-order bar: directly above the nav + profile nudge. */
export const BAR_BOTTOM = `calc(${NAV} + ${NUDGE} + ${SAFE})`;

/** Bottom offset for the profile nudge: directly above the nav. */
export const NUDGE_BOTTOM = `calc(${NAV} + ${SAFE})`;

/** Bottom offset for the help bubble: above the nav, nudge and new-order bar. */
export const BUBBLE_BOTTOM = `calc(${NAV} + ${NUDGE} + ${BAR} + 0.75rem + ${SAFE})`;

function setVar(name: string, value: string | null): void {
  if (typeof document === 'undefined') return;
  try {
    const root = document.documentElement;
    if (value === null) root.style.removeProperty(name);
    else root.style.setProperty(name, value);
  } catch {
    /* ignore */
  }
}

const defaultMeasure = (el: HTMLElement): number => el.getBoundingClientRect().height;

/**
 * The bottom nav's content height, excluding its safe-area bottom padding (the
 * offsets add that back via `env(safe-area-inset-bottom)`), and including its
 * 1px top border. Falls back to the border-box height when padding is unknown.
 */
export const measureNavHeight = (el: HTMLElement): number => {
  const rect = el.getBoundingClientRect().height;
  const padBottom = parseFloat(getComputedStyle(el).paddingBottom);
  return Number.isFinite(padBottom) && padBottom > 0 ? rect - padBottom : rect;
};

/**
 * Measure an element and publish its height as `name` while `active` is true.
 * Returns a ref callback to attach to the element. `measure` defaults to the
 * border-box height; callers can override it (e.g. the bottom nav subtracts its
 * safe-area padding, which the offsets add back separately). A zero/unknown
 * height (an element not yet laid out, or a jsdom test) leaves the property
 * unset so the CSS fallback applies instead of collapsing the stack.
 */
export function useMeasuredStackVar(
  name: string,
  active: boolean,
  measure: (el: HTMLElement) => number = defaultMeasure,
): (el: HTMLElement | null) => void {
  const [el, setEl] = useState<HTMLElement | null>(null);
  // Keep the latest measurer without making it an effect dependency, so an
  // inline arrow at the call site does not restart the observer every render.
  const measureRef = useRef(measure);
  measureRef.current = measure;

  useEffect(() => {
    if (!active || !el) {
      setVar(name, null);
      return;
    }
    const apply = () => {
      const height = measureRef.current(el);
      setVar(name, height > 0 ? `${height}px` : null);
    };
    apply();
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(apply);
      observer.observe(el);
    }
    return () => {
      observer?.disconnect();
      setVar(name, null);
    };
  }, [name, active, el]);

  return setEl;
}

export { BAR_FALLBACK, NUDGE_FALLBACK, NAV_FALLBACK };
