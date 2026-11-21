/**
 * Concept: the minimum yield of a symbol, the length of the shortest string of terminals it
 * derives. Computed as a fixed point, like the nullable symbols.
 * Reference: SPEC 02, section 3.10.
 * Card: docs/concepts/10-minimum-yield.md
 */
import type { Grammar, Production, SymbolName } from '../grammar/types.js';

/**
 * minYield(A) for every nonterminal A: the fewest terminals any string derived from A has.
 * A nonterminal that derives no string of terminals at all (not productive) gets Infinity.
 *
 * - minYield(a) = 1 for a terminal a.
 * - minYield(A) = min over A → X1…Xk of minYield(X1) + … + minYield(Xk); 0 for A → ε.
 */
export function computeMinYield(grammar: Grammar): Map<SymbolName, number> {
  // Same fixed-point scheme as nullable, but with numbers instead of yes/no:
  // start from "∞" (no string known yet) and each round improves the value
  // of A with the sum of its right sides from the previous round. The values only
  // go down and are natural numbers, so at some point they stop changing.
  // Round i = the best value using derivation trees of height ≤ i. The nullable
  // symbols (step 7) are exactly the A with minYield(A) = 0.
  let current = new Map<SymbolName, number>();
  for (const nonterminal of grammar.nonterminals) {
    current.set(nonterminal, Infinity);
  }
  for (;;) {
    const next = minYieldRound({ productions: grammar.productions, previous: current });
    if (sameValues({ first: next, second: current })) {
      return next;
    }
    current = next;
  }
}

/**
 * The minimum yield of a sequence of symbols: the sum of theirs (a terminal counts 1).
 * The pushdown automaton (step 26) uses it on its stack: if the stack needs more terminals
 * than the input has left, that configuration cannot accept.
 */
export function minYieldOfSequence({
  symbols,
  minYield,
}: {
  symbols: readonly SymbolName[];
  /** minYield of each nonterminal; a symbol not in the map is a terminal and counts 1. */
  minYield: ReadonlyMap<SymbolName, number>;
}): number {
  return symbols.reduce((total, symbol) => total + (minYield.get(symbol) ?? 1), 0);
}

/** One round: each A keeps its value, or improves it with a production that gives a shorter string. */
function minYieldRound({
  productions,
  previous,
}: {
  productions: readonly Production[];
  /** The values at the end of the previous round. */
  previous: ReadonlyMap<SymbolName, number>;
}): Map<SymbolName, number> {
  const next = new Map(previous);
  for (const production of productions) {
    const length = minYieldOfSequence({ symbols: production.rightSide, minYield: previous });
    if (length < (next.get(production.leftSide) ?? Infinity)) {
      next.set(production.leftSide, length);
    }
  }
  return next;
}

/** True when both maps give every symbol the same value: the fixed point was reached. */
function sameValues({
  first,
  second,
}: {
  first: ReadonlyMap<SymbolName, number>;
  second: ReadonlyMap<SymbolName, number>;
}): boolean {
  return [...first].every(([symbol, value]) => second.get(symbol) === value);
}
