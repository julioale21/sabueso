/**
 * Concept: nullable symbols, A ⇒* ε, computed as a least fixed point.
 * Reference: Hopcroft 7.1.3; Augusto 2.3; SPEC 02, section 3.7.
 * Card: docs/concepts/07-nullable-symbols.md
 */
import type { Grammar, Production, SymbolName } from '../grammar/types.js';

/** Called after each round with its number (from 1) and the nullable set found so far. */
export type NullableIterationObserver = (
  iteration: number,
  nullable: ReadonlySet<SymbolName>,
) => void;

/**
 * The nonterminals that derive the empty string: A is nullable if some production
 * A → X1…Xk has every Xi nullable (k = 0, an ε-production, included).
 *
 * Each round uses only the result of the previous round, so round i finds exactly the
 * symbols with an ε-derivation tree of height i. The last round adds nothing: it is the
 * check that the fixed point was reached.
 */
export function computeNullable(
  grammar: Grammar,
  onIteration?: NullableIterationObserver,
): Set<SymbolName> {
  // ES: Punto fijo mínimo: se parte de ∅ y se aplica la regla hasta que el conjunto no cambia.
  // ES: Ronda 1: los A con A → ε. Ronda i: los A con A → X1…Xk y todos los Xi ya anulables.
  // ES: Termina porque el conjunto solo crece y está acotado por |N|: a lo sumo |N| + 1 rondas.
  // ES: Un terminal nunca es anulable (siempre consume un símbolo), así que nunca entra.
  let nullable = new Set<SymbolName>();
  for (let iteration = 1; ; iteration++) {
    const next = nullableRound(grammar.productions, nullable);
    onIteration?.(iteration, next);
    if (next.size === nullable.size) {
      return next;
    }
    nullable = next;
  }
}

/** One round: the symbols already known, plus every A with a right side that is all nullable. */
function nullableRound(
  productions: readonly Production[],
  known: ReadonlySet<SymbolName>,
): Set<SymbolName> {
  const next = new Set(known);
  for (const production of productions) {
    if (derivesEmptyString(production, known)) {
      next.add(production.leftSide);
    }
  }
  return next;
}

/** A → X1…Xk derives ε when every Xi is nullable. `every` is true for k = 0, so A → ε counts. */
function derivesEmptyString(production: Production, nullable: ReadonlySet<SymbolName>): boolean {
  return production.rightSide.every((symbol) => nullable.has(symbol));
}
