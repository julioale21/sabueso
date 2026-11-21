/**
 * Concept: DEL, the step of the Chomsky normal form that removes the ε-productions A → ε.
 * Reference: Hopcroft 7.1.3; SPEC 02, section 3.23.
 * Card: docs/concepts/22-chomsky-normal-form.md
 */
import { computeNullable } from '../analysis/nullable.js';
import type { Grammar, SymbolName } from '../grammar/types.js';
import { rewriteGrammar, type NewProduction } from './rewrite.js';

/**
 * G' without ε-productions, with L(G') = L(G) − {ε}, plus S → ε for the start symbol S when
 * ε ∈ L(G):
 *
 * 1. Find the nullable symbols (step 7).
 * 2. Replace each production A → X1…Xk by every version that drops some of its nullable Xi.
 * 3. Drop the versions with an empty right side, except S → ε when S is nullable.
 *
 * Expects the start symbol to appear on no right side, as START leaves it.
 */
export function removeEpsilonProductions(grammar: Grammar): Grammar {
  // DEL: if B is nullable, a derivation can use B or erase it. A → α B β then becomes
  // A → α B β | α β. With m nullable occurrences there are 2^m versions (with or without
  // each one). The versions keep every sentence except ε itself, which is why A → ε
  // itself is dropped.
  const nullable = computeNullable(grammar);
  const productions = grammar.productions.flatMap((production) =>
    withoutNullableSymbols(production.rightSide, nullable).map((rightSide) => ({
      leftSide: production.leftSide,
      rightSide,
    })),
  );
  return rewriteGrammar(grammar, {
    productions: productions.filter((production) => keepsProduction(production, grammar)),
  });
}

/**
 * Every right side obtained by erasing some of the nullable symbols, the original first:
 * A B x with A nullable gives A B x and B x. The empty one is included if all are nullable.
 */
function withoutNullableSymbols(
  rightSide: readonly SymbolName[],
  nullable: ReadonlySet<SymbolName>,
): SymbolName[][] {
  // Built symbol by symbol: each version so far is extended with Xi and, if Xi is
  // nullable, also without it. Order: keeping a symbol comes before erasing it.
  let versions: SymbolName[][] = [[]];
  for (const symbol of rightSide) {
    versions = versions.flatMap((version) =>
      nullable.has(symbol) ? [[...version, symbol], version] : [[...version, symbol]],
    );
  }
  return versions;
}

/** Every production stays except A → ε; only S → ε survives (S the start), when ε ∈ L(G). */
function keepsProduction(production: NewProduction, grammar: Grammar): boolean {
  return production.rightSide.length > 0 || production.leftSide === grammar.start;
}
