/**
 * Concept: START, the first step of the Chomsky normal form: a new start symbol S0 → S, only
 * when S appears on some right side.
 * Guide: docs/guides/23-fnc-start-del-unit.md
 */
import type { Grammar } from '../grammar/types.js';
import { freshSymbol, rewriteGrammar } from './rewrite.js';

/** The name of the new start symbol; it gets primes (S0') if the grammar already uses it. */
export const NEW_START = 'S0';

/**
 * If the start symbol S appears on some right side, G' = G plus a new start symbol S0 and the
 * production S0 → S, placed first. Otherwise G is returned as it is: S already does the job
 * of S0. Either way L(G') = L(G), and the start symbol of G' appears on no right side.
 */
export function addNewStart(grammar: Grammar): Grammar {
  // START exists so that the FNC can keep S → ε when ε ∈ L(G) without that ε being usable
  // inside another production. That only needs S to be on no right side:
  // - if some production uses S on its right side (A → … S …), a new S0 → S is added;
  // - if none does, S already meets that condition: the grammar is returned unchanged
  //   and S stays as the start symbol.
  if (!appearsOnSomeRightSide({ grammar, symbol: grammar.start })) {
    return grammar;
  }
  const newStart = freshSymbol({ grammar, name: NEW_START });
  return rewriteGrammar({
    grammar,
    start: newStart,
    newNonterminals: [newStart],
    productions: [{ leftSide: newStart, rightSide: [grammar.start] }, ...grammar.productions],
  });
}

/** Whether some production uses the symbol on its right side, as in S → ( S ) S. */
export function appearsOnSomeRightSide({
  grammar,
  symbol,
}: {
  grammar: Grammar;
  symbol: string;
}): boolean {
  return grammar.productions.some((production) => production.rightSide.includes(symbol));
}
