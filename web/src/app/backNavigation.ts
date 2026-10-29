/**
 * Android back-button policy. Pure function so the decision table can be unit
 * tested without a device: overlay first, then route history, then a deliberate
 * root-exit rule instead of an accidental close.
 */
export type BackDecision = 'overlay' | 'history' | 'exit' | 'confirm-exit';

export interface BackContext {
  /** An overlay (sheet/dialog) is open and was dismissed by the caller. */
  overlayClosed: boolean;
  /** There is a previous entry inside the app's own history. */
  hasHistory: boolean;
  /** The user already pressed back once at the root within the grace window. */
  exitArmed: boolean;
}

/**
 * Resolve what a back gesture should do:
 * 1. Close the top overlay if one is open.
 * 2. Go back within the app when there is in-app history.
 * 3. Otherwise, arm/confirm exit — the first press warns, the second exits.
 */
export function decideBack(ctx: BackContext): BackDecision {
  if (ctx.overlayClosed) return 'overlay';
  if (ctx.hasHistory) return 'history';
  return ctx.exitArmed ? 'exit' : 'confirm-exit';
}
