import { useSyncExternalStore } from 'react';

/**
 * Motion tokens (Phase 3, Step 11). The ONE place easings and durations are
 * defined for JS (Framer Motion). The same values are mirrored as CSS custom
 * properties in `src/index.css` (`--es-ease-*`, `--es-dur-*`) and referenced by
 * `tailwind.config.js`, so CSS and JS never drift; `motion.test.ts` asserts the
 * two copies stay identical.
 *
 * Rules (AGENTS.md "Motion"): animate transform and opacity only, keep UI
 * changes in 150–300ms (sheets up to 350ms), and collapse movement for
 * `prefers-reduced-motion: reduce`.
 */
export type Bezier = [number, number, number, number];

/** Default decelerating ease for entering/leaving UI. */
export const EASE_OUT: Bezier = [0.22, 1, 0.36, 1];
/** Gentle overshoot for pops (badges, chips). */
export const EASE_SPRING: Bezier = [0.34, 1.56, 0.64, 1];

/** Seconds, for Framer Motion's `transition.duration`. */
export const DURATION = { fast: 0.15, base: 0.2, slow: 0.25, sheet: 0.3, tick: 1 } as const;
/**
 * Milliseconds, for CSS timeouts that must match a token. `tick` is the
 * countdown refresh period (`useNow(1000)`), used to smooth the draining
 * progress fills with a linear `scaleX` transition — it is a clock interval,
 * not a UI-change duration.
 */
export const DURATION_MS = { fast: 150, base: 200, slow: 250, sheet: 300, tick: 1000 } as const;

/** CSS `cubic-bezier(...)` strings, mirroring the values above. */
export const EASE_OUT_CSS = `cubic-bezier(${EASE_OUT.join(', ')})`;
export const EASE_SPRING_CSS = `cubic-bezier(${EASE_SPRING.join(', ')})`;

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function mediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(REDUCED_QUERY);
}

/** Non-React read of the user's reduced-motion preference. */
export function prefersReducedMotion(): boolean {
  return mediaQuery()?.matches ?? false;
}

function subscribe(onChange: () => void): () => void {
  const mq = mediaQuery();
  if (!mq) return () => undefined;
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

/**
 * React read of the reduced-motion preference. Uses `useSyncExternalStore` so a
 * live OS change is reflected without a re-mount, and returns `false` (motion
 * on) where `matchMedia` is unavailable (jsdom, older shells).
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    prefersReducedMotion,
    () => false,
  );
}
