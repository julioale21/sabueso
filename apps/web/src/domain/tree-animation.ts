/**
 * When and how fast the tree builds itself with the derivation (SPEC 03, step 18): only short
 * derivations, in about five seconds in total.
 */

/** Longer derivations (L1 has hundreds of steps) appear whole: building them would take ages. */
export const MAX_ANIMATED_STEPS = 40;

const TOTAL_TIME = 5000;
const FASTEST_STEP = 120;
const SLOWEST_STEP = 600;

/** Milliseconds between two steps, so the whole derivation takes about five seconds. */
export function stepInterval(steps: number): number {
  const interval = Math.round(TOTAL_TIME / Math.max(steps, 1));
  return Math.min(SLOWEST_STEP, Math.max(FASTEST_STEP, interval));
}
