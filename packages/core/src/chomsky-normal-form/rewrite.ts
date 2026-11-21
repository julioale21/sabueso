/**
 * Concept: the grammar G' that each step of the Chomsky normal form builds from G. Σ never
 * changes; N only grows (S0, and later T_a and Xi), and P is rewritten.
 * Reference: Hopcroft 7.1; SPEC 02, section 3.23.
 * Card: docs/concepts/22-chomsky-normal-form.md
 */
import type { Grammar, Production, SymbolName } from '../grammar/types.js';

/** A production before it gets its number in the new grammar. */
export interface NewProduction {
  leftSide: SymbolName;
  rightSide: readonly SymbolName[];
}

/** What changes from G to G': the productions, and maybe the start symbol and N. */
export interface Rewrite {
  productions: readonly NewProduction[];
  start?: SymbolName;
  /** Nonterminals added by the step (S0, T_a, Xi). */
  newNonterminals?: readonly SymbolName[];
}

/**
 * Builds G' from G and the rewrite. Unlike buildGrammar, N is kept as it was: a nonterminal
 * left without productions (A in A → ε, after DEL) stays a nonterminal, so it never turns
 * into a terminal by accident. It is non-productive, and the USELESS step removes it.
 * A production that appears twice is kept once (P is a set), in the order it first appeared.
 */
export function rewriteGrammar(grammar: Grammar, rewrite: Rewrite): Grammar {
  const nonterminals = new Set([...(rewrite.newNonterminals ?? []), ...grammar.nonterminals]);
  const productions = uniqueProductions(rewrite.productions);
  const productionsByLeftSide = new Map<SymbolName, Production[]>();
  for (const nonterminal of nonterminals) {
    productionsByLeftSide.set(nonterminal, []);
  }
  for (const production of productions) {
    productionsByLeftSide.get(production.leftSide)?.push(production);
  }
  return {
    name: grammar.name,
    start: rewrite.start ?? grammar.start,
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

/** A symbol that is not in N or Σ: the name itself, or with primes until it is new (S0'). */
export function freshSymbol(grammar: Grammar, name: SymbolName): SymbolName {
  let candidate = name;
  while (grammar.nonterminals.has(candidate) || grammar.terminals.has(candidate)) {
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
