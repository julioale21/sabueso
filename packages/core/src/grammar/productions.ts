/**
 * Concept: P, the productions of G = (N, Σ, P, S): a set, so each production is told apart by
 * its symbols, and grouped by left side, so an algorithm finds every A → α of a nonterminal A.
 * Guide: docs/guides/02-gramatica-libre-de-contexto.md
 */
import type { Production, SymbolName } from './types.js';

/** A key that identifies a production by its symbols, not by its number. */
export function productionKey(production: {
  leftSide: SymbolName;
  rightSide: readonly SymbolName[];
}): string {
  return JSON.stringify([production.leftSide, ...production.rightSide]);
}

/**
 * The productions of each nonterminal, in order, so an algorithm can expand A quickly: Earley's
 * Predictor, on "• A", needs every A → α without scanning all of P. A nonterminal without
 * productions gets an empty list.
 */
export function groupByLeftSide({
  nonterminals,
  productions,
}: {
  nonterminals: ReadonlySet<SymbolName>;
  productions: readonly Production[];
}): Map<SymbolName, Production[]> {
  const productionsByLeftSide = new Map<SymbolName, Production[]>();
  for (const nonterminal of nonterminals) {
    productionsByLeftSide.set(nonterminal, []);
  }
  for (const production of productions) {
    productionsByLeftSide.get(production.leftSide)?.push(production);
  }
  return productionsByLeftSide;
}
