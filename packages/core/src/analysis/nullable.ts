/**
 * Concept: nullable symbols, A ⇒* ε, computed as a least fixed point.
 * Reference: Hopcroft 7.1.3; Augusto 2.3; SPEC 02, section 3.7.
 * Card: docs/concepts/07-nullable-symbols.md
 */
import type { Grammar, Production, SymbolName } from '../grammar/types.js';
import {
  repeatRuleUntilNoChange,
  nonterminalsWithProductionMatching,
  type RoundListener,
} from './fixed-point.js';

/**
 * The nonterminals that derive the empty string: A is nullable if some production
 * A → X1…Xk has every Xi nullable (k = 0, an ε-production, included).
 *
 * Round i finds exactly the symbols whose lowest ε-derivation tree has height i. The last
 * round adds nothing: it is the check that the fixed point was reached.
 */
export function computeNullable({
  grammar,
  onRound,
}: {
  grammar: Grammar;
  /** Called after each round with the nullable symbols found so far (the --steps table). */
  onRound?: RoundListener | undefined;
}): Set<SymbolName> {
  // Round 1: the A with A → ε. Round i: the A with A → X1…Xk and every Xi already nullable.
  // A terminal is never nullable (it always contributes a symbol), so it never enters.
  return repeatRuleUntilNoChange({
    start: [],
    newSymbolsOfRound: (nullable) =>
      nonterminalsWithProductionMatching({
        productions: grammar.productions,
        condition: (production) => derivesEmptyString({ production, nullable }),
      }),
    onRound,
  });
}

/** A → X1…Xk derives ε when every Xi is nullable. `every` is true for k = 0, so A → ε counts. */
function derivesEmptyString({
  production,
  nullable,
}: {
  production: Production;
  /** The symbols already known to be nullable. */
  nullable: ReadonlySet<SymbolName>;
}): boolean {
  return production.rightSide.every((symbol) => nullable.has(symbol));
}
