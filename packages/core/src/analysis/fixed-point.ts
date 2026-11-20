/**
 * Concept: the least fixed point, the scheme behind most grammar analyses (nullable,
 * productive, reachable…): start from a set and apply a rule until nothing changes.
 * Reference: Hopcroft 7.1; SPEC 02, sections 3.7 and 3.8.
 * Card: docs/concepts/07-nullable-symbols.md
 */
import type { Production, SymbolName } from '../grammar/types.js';

/** Called after each round with its number (from 1) and every symbol known so far. */
export type FixedPointObserver = (round: number, known: ReadonlySet<SymbolName>) => void;

/**
 * Least fixed point by rounds: starts from `start` and, each round, adds the symbols the rule
 * finds using only what was known at the end of the previous round. Stops when a round adds
 * nothing, and returns that set.
 *
 * It always stops: the set only grows, and the rule can only add symbols of a finite set.
 */
export function leastFixedPoint(
  start: Iterable<SymbolName>,
  newSymbolsOfRound: (knownBefore: ReadonlySet<SymbolName>) => Iterable<SymbolName>,
  onIteration?: FixedPointObserver,
): Set<SymbolName> {
  // Least fixed point: start from `start` (almost always ∅); each round applies the rule
  // to what was known at the end of the previous round (knownBefore). New symbols go to
  // another set (knownAfter), so a symbol found in this round only counts in the
  // next one: round i holds the symbols that need i applications of the rule.
  // It stops because the set only grows and is bounded (at most |N| + 1 rounds).
  let knownBefore = new Set(start);
  for (let round = 1; ; round++) {
    const knownAfter = new Set([...knownBefore, ...newSymbolsOfRound(knownBefore)]);
    onIteration?.(round, knownAfter);
    if (knownAfter.size === knownBefore.size) {
      return knownAfter; // nothing new: fixed point
    }
    knownBefore = knownAfter;
  }
}

/** The left sides of the productions that satisfy the condition: the usual rule of a round. */
export function leftSidesWhere(
  productions: readonly Production[],
  condition: (production: Production) => boolean,
): SymbolName[] {
  return productions.filter(condition).map((production) => production.leftSide);
}
