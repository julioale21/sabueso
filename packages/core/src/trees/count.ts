/**
 * Concept: counting the parse trees of an input without building them, by dynamic
 * programming over the links of the Earley items. With Pasos → Pasos Pasos, the count of G0
 * grows exponentially with the number of steps.
 * Reference: SPEC 02, section 3.20.
 * Card: docs/concepts/19-tree-count-catalan.md
 */
import { computeNullable } from '../analysis/nullable.js';
import type { EarleyItem, Link } from '../earley/item.js';
import type { Recognition } from '../earley/recognizer.js';
import type { Grammar, SymbolName } from '../grammar/types.js';
import { countEpsilonTrees } from './epsilon.js';
import { addCounts, multiplyCounts, type TreeCount } from './tree.js';

/** How many trees the input has: 0n if it was rejected, 'infinite' if the grammar has a cycle on it. */
export function countTrees({
  grammar,
  recognition,
}: {
  grammar: Grammar;
  recognition: Recognition;
}): TreeCount {
  // The trees of an item are, for each of its links, the trees of the items before the
  // dot (its predecessor) times the trees of what the link recognized (its cause). So the
  // count follows the same links as the enumeration of step 19, but multiplies and adds
  // numbers instead of building trees. Remembering the count of each item (memoization)
  // makes every item be counted once: that is what turns C(197) into a fast computation.
  const accepting = recognition.chart
    .at(-1)
    ?.items.find((item) => item.production === recognition.startProduction && item.dot === 1);
  if (!recognition.accepted || accepting === undefined) {
    return 0n;
  }
  const context: CountContext = {
    grammar,
    nullableSymbols: computeNullable({ grammar }),
    known: new Map(),
    inProgress: new Set(),
    epsilonCounts: new Map(),
  };
  return countItem({ context, item: accepting });
}

/** What the count needs besides the item: the memory and the items being counted now. */
interface CountContext {
  grammar: Grammar;
  nullableSymbols: ReadonlySet<SymbolName>;
  /** The count of every item already counted (memoization). */
  known: Map<EarleyItem, TreeCount>;
  /** The items whose count is being computed right now, to detect cycles. */
  inProgress: Set<EarleyItem>;
  /** The memory of countEpsilonTrees, shared by every nullable link. */
  epsilonCounts: Map<SymbolName, TreeCount>;
}

/**
 * count(item) = 1 if the dot is at 0; otherwise the sum, over its links, of
 * count(predecessor) × count(cause). Meeting an item that is still being counted means
 * a cycle: infinitely many trees.
 */
function countItem({ context, item }: { context: CountContext; item: EarleyItem }): TreeCount {
  const remembered = context.known.get(item);
  if (remembered !== undefined) {
    return remembered;
  }
  if (item.dot === 0) {
    return 1n;
  }
  if (context.inProgress.has(item)) {
    return 'infinite';
  }
  context.inProgress.add(item);
  let total: TreeCount = 0n;
  for (const link of item.links) {
    const ways = multiplyCounts({
      first: countItem({ context, item: link.predecessor }),
      second: countCause({ context, link }),
    });
    total = addCounts({ first: total, second: ways });
  }
  context.inProgress.delete(item);
  context.known.set(item, total);
  return total;
}

/** The trees of what a link recognized: 1 for a token, the child's count, or the ε-trees. */
function countCause({ context, link }: { context: CountContext; link: Link }): TreeCount {
  if (link.kind === 'scan') {
    return 1n;
  }
  if (link.kind === 'complete') {
    return countItem({ context, item: link.child });
  }
  return countEpsilonTrees({
    grammar: context.grammar,
    nullableSymbols: context.nullableSymbols,
    symbol: link.symbol,
    known: context.epsilonCounts,
  });
}
