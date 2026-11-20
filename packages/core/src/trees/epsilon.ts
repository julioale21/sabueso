/**
 * Concept: the ε-trees of a nullable symbol, the subtrees that derive the empty string.
 * A nullable link of Earley (step 15) points to no item, so these subtrees are built from
 * the grammar instead.
 * Reference: SPEC 02, section 3.19.
 * Card: docs/concepts/18-backpointers-and-trees.md
 */
import type { Grammar, Production, SymbolName } from '../grammar/types.js';
import { addCounts, multiplyCounts, type ParseTree, type TreeCount } from './tree.js';

/**
 * How many ε-trees the symbol has: the sum, over its productions B → X1…Xk with every Xi
 * nullable, of the product of the ε-trees of each Xi (1 for B → ε). 'infinite' if the
 * symbol can derive ε through itself again (a cycle among nullable symbols).
 */
export function countEpsilonTrees(
  grammar: Grammar,
  nullable: ReadonlySet<SymbolName>,
  symbol: SymbolName,
  known: Map<SymbolName, TreeCount> = new Map(),
  inProgress: Set<SymbolName> = new Set(),
): TreeCount {
  // A count depends on the counts of the symbols of its productions, so it is computed
  // depth-first and remembered (memoization). Meeting a symbol that is still being
  // counted means it derives ε through itself: S ⇒+ S with nothing produced, so the
  // derivation can loop as many times as wanted and there are infinitely many trees.
  const remembered = known.get(symbol);
  if (remembered !== undefined) {
    return remembered;
  }
  if (inProgress.has(symbol)) {
    return 'infinite';
  }
  inProgress.add(symbol);
  let total: TreeCount = 0n;
  for (const production of emptyProductionsOf(grammar, nullable, symbol)) {
    const ways = production.rightSide.reduce<TreeCount>(
      (product, child) =>
        multiplyCounts(product, countEpsilonTrees(grammar, nullable, child, known, inProgress)),
      1n,
    );
    total = addCounts(total, ways);
  }
  inProgress.delete(symbol);
  known.set(symbol, total);
  return total;
}

/**
 * Every ε-tree of the symbol, built from the grammar: a node B with the production used and
 * one ε-subtree per symbol of its right side, or a single ε leaf for B → ε.
 *
 * Productions that would use a symbol already on the path are skipped, so with a cycle
 * this lists only the trees without repeated symbols (countEpsilonTrees says 'infinite').
 */
export function epsilonTrees(
  grammar: Grammar,
  nullable: ReadonlySet<SymbolName>,
  symbol: SymbolName,
  path: ReadonlySet<SymbolName> = new Set(),
): ParseTree[] {
  const onPath = new Set([...path, symbol]);
  return emptyProductionsOf(grammar, nullable, symbol)
    .filter((production) => production.rightSide.every((child) => !onPath.has(child)))
    .flatMap((production) =>
      combinations(
        production.rightSide.map((child) => epsilonTrees(grammar, nullable, child, onPath)),
      ).map((children): ParseTree => ({
        kind: 'nonterminal',
        symbol,
        production,
        children: children.length === 0 ? [{ kind: 'epsilon' }] : children,
      })),
    );
}

/** The productions B → X1…Xk of the symbol whose right side can vanish entirely. */
function emptyProductionsOf(
  grammar: Grammar,
  nullable: ReadonlySet<SymbolName>,
  symbol: SymbolName,
): readonly Production[] {
  return (grammar.productionsByLeftSide.get(symbol) ?? []).filter((production) =>
    production.rightSide.every((child) => nullable.has(child)),
  );
}

/**
 * Every way of choosing one tree for each position: [[a1, a2], [b1]] gives
 * [[a1, b1], [a2, b1]]. An empty list of positions gives one empty choice.
 */
function combinations(options: readonly ParseTree[][]): ParseTree[][] {
  return options.reduce<ParseTree[][]>(
    (choices, treesForPosition) =>
      choices.flatMap((choice) => treesForPosition.map((tree) => [...choice, tree])),
    [[]],
  );
}
