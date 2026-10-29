/** Kitchen prep time (KPT) bounds. Mirrors the legacy 15/20/25/30 chips with a
 *  five-minute stepper, bounded to a sane kitchen range. */
export const PREP_MIN = 5;
export const PREP_MAX = 120;
export const PREP_STEP = 5;
export const PREP_QUICK_CHOICES = [15, 20, 25, 30];

export function clampPrepMinutes(minutes: number): number {
  return Math.min(PREP_MAX, Math.max(PREP_MIN, minutes));
}
