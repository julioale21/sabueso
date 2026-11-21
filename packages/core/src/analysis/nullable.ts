/**
 * Concept: nullable symbols, A ⇒* ε, computed as a least fixed point.
 * Reference: Hopcroft 7.1.3; Augusto 2.3; SPEC 02, section 3.7.
 * Card: docs/concepts/07-nullable-symbols.md
 */
import type { Grammar, Production, SymbolName } from '../grammar/types.js';
import { repeatRuleUntilNoChange, type RoundListener } from './fixed-point.js';

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
    newSymbolsOfRound: (nullableSymbols) => newNullableSymbols({ grammar, nullableSymbols }),
    onRound,
  });
}

/** The rule of a round: the left sides of the productions that derive ε with what is known. */
function newNullableSymbols({
  grammar,
  nullableSymbols,
}: {
  grammar: Grammar;
  /** The symbols known to be nullable at the end of the previous round. */
  nullableSymbols: ReadonlySet<SymbolName>;
}): SymbolName[] {
  return grammar.productions
    .filter((production) => derivesEmptyString({ production, nullableSymbols }))
    .map((production) => production.leftSide);
}

/** A → X1…Xk derives ε when every Xi is nullable. `every` is true for k = 0, so A → ε counts. */
function derivesEmptyString({
  production,
  nullableSymbols,
}: {
  production: Production;
  /** The symbols already known to be nullable. */
  nullableSymbols: ReadonlySet<SymbolName>;
}): boolean {
  return production.rightSide.every((symbol) => nullableSymbols.has(symbol));
}
