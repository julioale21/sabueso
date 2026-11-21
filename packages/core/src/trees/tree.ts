/**
 * Concept: the parse tree (derivation tree) of a sentence, and the arithmetic to count
 * trees, which can be infinite when the grammar has cycles.
 * Card: docs/concepts/18-backpointers-and-trees.md
 */
import type { Production, SymbolName } from '../grammar/types.js';

/**
 * A node of a parse tree:
 * - a leaf with a token of the input (tokenIndex says which one);
 * - a leaf ε, for a nonterminal that derived the empty string;
 * - an inner node A, with the production A → X1…Xk used and one child per Xi.
 */
export type ParseTree =
  | { kind: 'terminal'; symbol: SymbolName; tokenIndex: number }
  | { kind: 'epsilon' }
  | { kind: 'nonterminal'; symbol: SymbolName; production: Production; children: ParseTree[] };

/** How many trees: an exact number (bigint, it grows like Catalan) or infinitely many. */
export type TreeCount = bigint | 'infinite';

/** The sum of two counts: alternatives, "one way or the other". Infinite absorbs. */
export function addCounts({ first, second }: { first: TreeCount; second: TreeCount }): TreeCount {
  return first === 'infinite' || second === 'infinite' ? 'infinite' : first + second;
}

/**
 * The product of two counts: independent choices, "one way and then the other". A zero
 * wins over infinite (no way to build the first part means no tree at all).
 */
export function multiplyCounts({
  first,
  second,
}: {
  first: TreeCount;
  second: TreeCount;
}): TreeCount {
  if (first === 0n || second === 0n) {
    return 0n;
  }
  return first === 'infinite' || second === 'infinite' ? 'infinite' : first * second;
}
