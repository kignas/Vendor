/**
 * Support phone number (Phase 3, Step 7). The backend contract exposes NO
 * support-contact endpoint, so the number can only come from build config.
 *
 * AGENTS.md rule 9: secrets and origins live in env, not in code. The number is
 * therefore read from `VITE_SUPPORT_PHONE` and is treated as ABSENT unless it
 * is a real phone number — so a placeholder, a blank value, or a stray string
 * never produces a "Call support" action that dials nothing.
 */
/** E.164-ish: an optional leading + then 7–15 digits, allowing spaces/dashes/parens. */
const PHONE_RE = /^\+?\d{7,15}$/;

/**
 * The support number to dial, or null when none is configured. The returned
 * value has its formatting characters stripped so it can go straight into a
 * `tel:` link.
 */
export function supportPhone(): string | null {
  const candidate = (import.meta.env.VITE_SUPPORT_PHONE ?? '').trim();
  if (!candidate) return null;
  const compact = candidate.replace(/[\s().-]/g, '');
  return PHONE_RE.test(compact) ? compact : null;
}
