/**
 * Concept: the grammar G' that each step of the Chomsky normal form builds from G. Σ never
 * changes; N only grows (S0, and later T_a and Xi), and P is rewritten.
 * Card: docs/concepts/22-chomsky-normal-form.md
 */
import type { Grammar, Production, SymbolName } from '../grammar/types.js';

/** A production before it gets its number in the new grammar. */
export interface NewProduction {
  leftSide: SymbolName;
  rightSide: readonly SymbolName[];
}

/**
 * Builds G' from G: its productions, and maybe a new start symbol and new nonterminals. Σ is
 * the one of G. Unlike buildGrammar, N is kept as it was: a nonterminal
 * left without productions (A in A → ε, after DEL) stays a nonterminal, so it never turns
 * into a terminal by accident. It is non-productive, and the USELESS step removes it with
 * removedNonterminals.
 * A production that appears twice is kept once (P is a set), in the order it first appeared.
 */
export function rewriteGrammar({
  grammar,
  productions: newProductions,
  start = grammar.start,
  newNonterminals = [],
  removedNonterminals = new Set(),
}: {
  /** G, the grammar before the step. */
  grammar: Grammar;
  /** P of G', still without numbers. */
  productions: readonly NewProduction[];
  /** The start symbol of G', if the step changes it (START). */
  start?: SymbolName | undefined;
  /** Nonterminals added by the step (S0, T_a, Xi). */
  newNonterminals?: readonly SymbolName[] | undefined;
  /** Nonterminals the step takes out of N (the useless ones, in USELESS). */
  removedNonterminals?: ReadonlySet<SymbolName> | undefined;
}): Grammar {
  const nonterminals = new Set(
    [...newNonterminals, ...grammar.nonterminals].filter(
      (nonterminal) => !removedNonterminals.has(nonterminal),
    ),
  );
  const productions = uniqueProductions(newProductions);
  const productionsByLeftSide = new Map<SymbolName, Production[]>();
  for (const nonterminal of nonterminals) {
    productionsByLeftSide.set(nonterminal, []);
  }
  for (const production of productions) {
    productionsByLeftSide.get(production.leftSide)?.push(production);
  }
  return {
    name: grammar.name,
    start,
    nonterminals,
    terminals: grammar.terminals,
    productions,
    productionsByLeftSide,
  };
}

/** A key that identifies a production by its symbols, not by its number. */
export function productionKey(production: NewProduction): string {
  return JSON.stringify([production.leftSide, ...production.rightSide]);
}

/**
 * A symbol that is not in N or Σ, nor among the names the step already took: the name
 * itself, or with primes until it is new (S0').
 */
export function freshSymbol({
  grammar,
  name,
  taken = new Set(),
}: {
  grammar: Grammar;
  name: SymbolName;
  /** Names already chosen in the same step (TERM and BIN create several). */
  taken?: ReadonlySet<SymbolName> | undefined;
}): SymbolName {
  let candidate = name;
  while (
    grammar.nonterminals.has(candidate) ||
    grammar.terminals.has(candidate) ||
    taken.has(candidate)
  ) {
    candidate = `${candidate}'`;
  }
  return candidate;
}

/** Numbers the productions from 0, dropping repeated ones. */
function uniqueProductions(productions: readonly NewProduction[]): Production[] {
  const seen = new Set<string>();
  const unique: Production[] = [];
  for (const production of productions) {
    const key = productionKey(production);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({
        id: unique.length,
        leftSide: production.leftSide,
        rightSide: [...production.rightSide],
      });
    }
  }
  return unique;
}
