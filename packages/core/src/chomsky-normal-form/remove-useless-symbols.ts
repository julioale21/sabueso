/**
 * Concept: USELESS, the step of the Chomsky normal form that removes the useless symbols:
 * the nonterminals that derive no string of terminals or that S never reaches.
 * Card: docs/concepts/22-chomsky-normal-form.md
 */
import { analyzeUsefulSymbols } from '../analysis/useful.js';
import type { Grammar, Production, SymbolName } from '../grammar/types.js';
import { rewriteGrammar } from './rewrite.js';

/**
 * G' without useless nonterminals or the productions that use them, with L(G') = L(G).
 * Reuses the analysis of step 9 (productive first, then reachable). The start symbol always
 * stays in N, even when L(G) = ∅: then G' has no productions at all. Σ does not change.
 * Returns the same grammar when every symbol is useful.
 */
export function removeUselessSymbols(grammar: Grammar): Grammar {
  // Why here, after DEL and UNIT: DEL can leave a nonterminal with no productions (A in
  // epsilon-trap), and UNIT can leave one that only a unit production reached (B in
  // A → B). Both are useless now, and nothing after this step creates useless symbols.
  const { useless } = analyzeUsefulSymbols(grammar);
  const removed = new Set([...useless].filter((symbol) => symbol !== grammar.start));
  if (useless.size === 0) {
    return grammar;
  }
  return rewriteGrammar({
    grammar,
    productions: grammar.productions.filter((production) =>
      usesNoUselessSymbol({ production, useless }),
    ),
    removedNonterminals: removed,
  });
}

/**
 * A production stays when neither its left side nor any symbol of its right side is useless.
 * This is the same as the textbook's two removals: if A is useful and every symbol of α is
 * productive, the symbols of α are reachable through A → α.
 */
function usesNoUselessSymbol({
  production,
  useless,
}: {
  production: Production;
  useless: ReadonlySet<SymbolName>;
}): boolean {
  return [production.leftSide, ...production.rightSide].every((symbol) => !useless.has(symbol));
}
