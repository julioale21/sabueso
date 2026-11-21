/**
 * Concept: TERM, the step of the Chomsky normal form that leaves terminals only in A → a:
 * each terminal a in a right side of length 2 or more is replaced by a new T_a → a.
 * Card: docs/concepts/22-chomsky-normal-form.md
 */
import type { Grammar, SymbolName } from '../grammar/types.js';
import { freshSymbol, rewriteGrammar } from './rewrite.js';

/** The prefix of the new nonterminals: T_CRI → CRI, T_( → (. */
export const TERMINAL_PREFIX = 'T_';

/**
 * G' where every right side of length 2 or more has only nonterminals: each terminal a in
 * them becomes T_a, and T_a → a is added once per terminal, at the end. Right sides of
 * length 0 or 1 (S → ε, A → a) do not change. L(G') = L(G). Returns the same grammar when
 * no long right side has a terminal.
 */
export function isolateTerminals(grammar: Grammar): Grammar {
  // In the FNC a terminal may only appear alone: A → a. In A → ( S ), the ( and ) are
  // "wrapped": T_( → ( and T_) → ), so A → T_( S T_). T_a derives only a, so each
  // derivation of G has its copy in G' with one extra step per wrapped terminal.
  const nonterminalOf = nonterminalsForTerminals(grammar);
  if (nonterminalOf.size === 0) {
    return grammar;
  }
  const productions = grammar.productions.map((production) => ({
    leftSide: production.leftSide,
    rightSide:
      production.rightSide.length < 2
        ? production.rightSide
        : production.rightSide.map((symbol) => nonterminalOf.get(symbol) ?? symbol),
  }));
  const terminalProductions = [...nonterminalOf].map(([terminal, nonterminal]) => ({
    leftSide: nonterminal,
    rightSide: [terminal],
  }));
  return rewriteGrammar({
    grammar,
    productions: [...productions, ...terminalProductions],
    newNonterminals: [...nonterminalOf.values()],
  });
}

/**
 * The new nonterminal for each terminal that appears in a right side of length 2 or more,
 * in order of first appearance: CRI ↦ T_CRI. A name already used gets primes (T_CRI').
 */
function nonterminalsForTerminals(grammar: Grammar): Map<SymbolName, SymbolName> {
  const nonterminalOf = new Map<SymbolName, SymbolName>();
  const longRightSides = grammar.productions
    .map((production) => production.rightSide)
    .filter((rightSide) => rightSide.length >= 2);
  for (const symbol of longRightSides.flat()) {
    if (grammar.terminals.has(symbol) && !nonterminalOf.has(symbol)) {
      const taken = new Set(nonterminalOf.values());
      nonterminalOf.set(
        symbol,
        freshSymbol({ grammar, name: `${TERMINAL_PREFIX}${symbol}`, taken }),
      );
    }
  }
  return nonterminalOf;
}
