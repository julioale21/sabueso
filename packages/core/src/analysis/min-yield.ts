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
  // ES: Mismo esquema de punto fijo que los anulables, pero con números en lugar de sí/no:
  // ES: se parte de "∞" (todavía no se conoce ninguna cadena) y cada ronda mejora el valor
  // ES: de A con la suma de sus lados derechos según la ronda anterior. Los valores solo
  // ES: bajan y son naturales, así que en algún momento dejan de cambiar.
  // ES: Ronda i = el mejor valor usando árboles de derivación de altura ≤ i. Los anulables
  // ES: (paso 7) son exactamente los A con minYield(A) = 0.
  let current = new Map<SymbolName, number>();
  for (const nonterminal of grammar.nonterminals) {
    current.set(nonterminal, Infinity);
  }
  for (;;) {
    const next = minYieldRound(grammar.productions, current);
    if (sameValues(next, current)) {
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
export function minYieldOfSequence(
  symbols: readonly SymbolName[],
  minYield: ReadonlyMap<SymbolName, number>,
): number {
  return symbols.reduce((total, symbol) => total + (minYield.get(symbol) ?? 1), 0);
}

/** One round: each A keeps its value, or improves it with a production that gives a shorter string. */
function minYieldRound(
  productions: readonly Production[],
  previous: ReadonlyMap<SymbolName, number>,
): Map<SymbolName, number> {
  const next = new Map(previous);
  for (const production of productions) {
    const length = minYieldOfSequence(production.rightSide, previous);
    if (length < (next.get(production.leftSide) ?? Infinity)) {
      next.set(production.leftSide, length);
    }
  }
  return next;
}

function sameValues(
  first: ReadonlyMap<SymbolName, number>,
  second: ReadonlyMap<SymbolName, number>,
): boolean {
  return [...first].every(([symbol, value]) => second.get(symbol) === value);
}
