/**
 * Concept: the CYK algorithm (Cocke–Younger–Kasami): membership in L(G) for a grammar in
 * Chomsky normal form, by dynamic programming over the substrings of the input, in O(n³·|G|).
 * Card: docs/concepts/23-cocke-younger-kasami.md
 */
import { productionsOutsideChomskyNormalForm } from '../chomsky-normal-form/index.js';
import type { Grammar, Production, SymbolName } from '../grammar/types.js';
import type { ParseTree } from '../trees/tree.js';

/** The CYK table, the verdict and one parse tree of the grammar in FNC. */
export interface CockeYoungerKasamiResult {
  /** w ∈ L(G): the start symbol is in T[0][n] (or S → ε, for the empty input). */
  accepted: boolean;
  /**
   * T[i][l]: the nonterminals that derive the l tokens that start at position i. Row i has
   * the lengths 1 … n − i; T[i][0] is always empty (in FNC only the start symbol derives ε,
   * and that case is checked apart).
   */
  table: Set<SymbolName>[][];
  /** A parse tree in FNC when accepted (the first one found), or null. */
  tree: ParseTree | null;
}

/**
 * Runs CYK on the tokens. The grammar must be in Chomsky normal form (toChomskyNormalForm);
 * any other grammar is a programming error and throws.
 */
export function recognizeCockeYoungerKasami({
  grammar,
  tokens,
}: {
  grammar: Grammar;
  tokens: readonly SymbolName[];
}): CockeYoungerKasamiResult {
  if (productionsOutsideChomskyNormalForm(grammar).length > 0) {
    throw new Error(
      `CYK needs a grammar in Chomsky normal form; convert "${grammar.name}" with toChomskyNormalForm`,
    );
  }
  const table = fillTable({ grammar, tokens });
  if (tokens.length === 0) {
    const production = emptyStartProduction(grammar);
    const tree: ParseTree | null =
      production === undefined
        ? null
        : {
            kind: 'nonterminal',
            symbol: grammar.start,
            production,
            children: [{ kind: 'epsilon' }],
          };
    return { accepted: tree !== null, table, tree };
  }
  const accepted = table[0]?.[tokens.length]?.has(grammar.start) ?? false;
  return {
    accepted,
    table,
    tree: accepted
      ? buildTree({
          grammar,
          tokens,
          table,
          symbol: grammar.start,
          start: 0,
          length: tokens.length,
        })
      : null,
  };
}

/**
 * Fills T by increasing length, so that the two shorter parts are always ready:
 * - length 1: T[i][1] = { A | A → wi };
 * - length l ≥ 2: A ∈ T[i][l] if A → B C, B ∈ T[i][k] and C ∈ T[i+k][l−k] for some split k.
 */
function fillTable({
  grammar,
  tokens,
}: {
  grammar: Grammar;
  tokens: readonly SymbolName[];
}): Set<SymbolName>[][] {
  // In FNC a substring of length l ≥ 2 can only come from A → B C: B derives a first part
  // of length k and C the rest. Trying every k (1 … l−1) and every A → B C covers every
  // possible tree, and each cell only uses shorter cells, already filled.
  const n = tokens.length;
  const table = Array.from({ length: n }, (_, start) =>
    Array.from({ length: n - start + 1 }, () => new Set<SymbolName>()),
  );
  tokens.forEach((token, start) => {
    for (const production of grammar.productions) {
      if (production.rightSide.length === 1 && production.rightSide[0] === token) {
        table[start]?.[1]?.add(production.leftSide);
      }
    }
  });
  for (let length = 2; length <= n; length++) {
    for (let start = 0; start + length <= n; start++) {
      for (let split = 1; split < length; split++) {
        for (const leftSide of splitMatches({ grammar, table, start, length, split })) {
          table[start]?.[length]?.add(leftSide);
        }
      }
    }
  }
  return table;
}

/** The A of every A → B C with B ∈ T[start][split] and C ∈ T[start+split][length−split]. */
function splitMatches({
  grammar,
  table,
  start,
  length,
  split,
}: {
  grammar: Grammar;
  table: Set<SymbolName>[][];
  start: number;
  length: number;
  /** k: how many tokens the first part (B) covers. */
  split: number;
}): SymbolName[] {
  return grammar.productions
    .filter((production) => explainsSplit({ production, table, start, length, split }))
    .map((production) => production.leftSide);
}

/**
 * Whether A → B C explains the cell split at k: B derives the first k tokens from `start`
 * (B ∈ T[start][k]) and C the other length − k (C ∈ T[start+k][length−k]).
 */
function explainsSplit({
  production,
  table,
  start,
  length,
  split,
}: {
  production: Production;
  table: Set<SymbolName>[][];
  start: number;
  length: number;
  split: number;
}): boolean {
  const [first, second] = production.rightSide;
  return (
    production.rightSide.length === 2 &&
    first !== undefined &&
    second !== undefined &&
    (table[start]?.[split]?.has(first) ?? false) &&
    (table[start + split]?.[length - split]?.has(second) ?? false)
  );
}

/**
 * The tree of `symbol` over the `length` tokens from `start`, read back from the table: the
 * first production (and the first split) that explains the cell. Every symbol in a cell has
 * one, because it was put there by one.
 */
function buildTree({
  grammar,
  tokens,
  table,
  symbol,
  start,
  length,
}: {
  grammar: Grammar;
  tokens: readonly SymbolName[];
  table: Set<SymbolName>[][];
  symbol: SymbolName;
  start: number;
  length: number;
}): ParseTree {
  // The recursion always ends: each call covers fewer tokens than the one before.
  const productions = grammar.productionsByLeftSide.get(symbol) ?? [];
  if (length === 1) {
    const token = tokens[start] ?? '';
    const production = productions.find(
      (each) => each.rightSide.length === 1 && each.rightSide[0] === token,
    );
    if (production === undefined) {
      throw new Error(`${symbol} is in T[${start}][1] but has no production → ${token}`);
    }
    return {
      kind: 'nonterminal',
      symbol,
      production,
      children: [{ kind: 'terminal', symbol: token, tokenIndex: start }],
    };
  }
  for (let split = 1; split < length; split++) {
    const production = productions.find((each) =>
      explainsSplit({ production: each, table, start, length, split }),
    );
    if (production !== undefined) {
      const [first = '', second = ''] = production.rightSide;
      return {
        kind: 'nonterminal',
        symbol,
        production,
        children: [
          buildTree({ grammar, tokens, table, symbol: first, start, length: split }),
          buildTree({
            grammar,
            tokens,
            table,
            symbol: second,
            start: start + split,
            length: length - split,
          }),
        ],
      };
    }
  }
  throw new Error(`${symbol} is in T[${start}][${length}] but no production explains it`);
}

/** S → ε for the start symbol: the only way a grammar in FNC accepts the empty input. */
function emptyStartProduction(grammar: Grammar): Production | undefined {
  return grammar.productions.find(
    (production) => production.leftSide === grammar.start && production.rightSide.length === 0,
  );
}
