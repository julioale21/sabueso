/**
 * When and how fast the tree builds itself with the derivation (SPEC 03, step 18): only short
 * derivations, slow enough to follow each step (about 16 seconds in total).
 */

/** Longer derivations (L1 has hundreds of steps) appear whole: building them would take ages. */
export const MAX_ANIMATED_STEPS = 40;

const TOTAL_TIME = 16_000;
const FASTEST_STEP = 700;
const SLOWEST_STEP = 1500;

/** Milliseconds between two steps: about 16 seconds in total, between 0.7 and 1.5 s per step (1.5 s is the slowest the speed control offers). */
export function stepInterval(steps: number): number {
  const interval = Math.round(TOTAL_TIME / Math.max(steps, 1));
  return Math.min(SLOWEST_STEP, Math.max(FASTEST_STEP, interval));
}
