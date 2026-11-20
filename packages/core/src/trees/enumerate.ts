/**
 * Concept: the parse trees of an accepted input, rebuilt by following the links of the
 * Earley items (backpointers), one tree at a time and up to a limit.
 * Reference: Hopcroft 5.2; SPEC 02, sections 3.18 and 3.21.
 * Card: docs/concepts/18-backpointers-and-trees.md
 */
import { computeNullable } from '../analysis/nullable.js';
import type { EarleyItem, Link } from '../earley/item.js';
import type { Recognition } from '../earley/recognizer.js';
import type { Grammar, SymbolName } from '../grammar/types.js';
import { epsilonTrees } from './epsilon.js';
import type { ParseTree } from './tree.js';

/** By default, at most this many trees: G0 can have C(197) of them for a single story. */
export const DEFAULT_TREE_LIMIT = 50;

/** The trees of an accepted input, up to the limit, in a fixed order. None if it was rejected. */
export function parseTrees(
  grammar: Grammar,
  recognition: Recognition,
  limit = DEFAULT_TREE_LIMIT,
): ParseTree[] {
  const trees: ParseTree[] = [];
  for (const tree of enumerateTrees(grammar, recognition)) {
    if (trees.length >= limit) {
      break;
    }
    trees.push(tree);
  }
  return trees;
}

/**
 * Every tree of an accepted input, one by one, without building the next one until it is
 * asked for. The order follows the order in which the links were added.
 */
export function* enumerateTrees(grammar: Grammar, recognition: Recognition): Generator<ParseTree> {
  // Each complete item (A → γ •, i) in Sk says "A derives the input from i to k". Its links
  // say how the dot moved over each symbol of γ: a scanned token, a complete child item, or
  // a nullable symbol. Following them backwards, from ($S → S •, 0) in the last set, gives
  // the children of each node: that is the parse tree. An item with several links gives
  // several trees: the ambiguity.
  const accepting = recognition.chart
    .at(-1)
    ?.items.find((item) => item.production === recognition.startProduction && item.dot === 1);
  if (!recognition.accepted || accepting === undefined) {
    return;
  }
  const context: TreeContext = { grammar, nullable: computeNullable(grammar), onPath: new Set() };
  for (const root of treesOfItem(context, accepting)) {
    // The root is $S → S; the tree of the story is its only child, S.
    const [story] = root.kind === 'nonterminal' ? root.children : [];
    if (story !== undefined) {
      yield story;
    }
  }
}

/** What the generators need besides the item. */
interface TreeContext {
  grammar: Grammar;
  nullable: ReadonlySet<SymbolName>;
  /** The items being expanded on the current path, to skip cycles. */
  onPath: Set<EarleyItem>;
}

/** The trees of a complete item (B → γ •, i): a node B whose children follow its links. */
function* treesOfItem(context: TreeContext, item: EarleyItem): Generator<ParseTree> {
  if (context.onPath.has(item)) {
    return; // a cycle (A ⇒+ A): this branch would never end, so it gives no tree
  }
  context.onPath.add(item);
  for (const children of childSequences(context, item)) {
    yield {
      kind: 'nonterminal',
      symbol: item.production.leftSide,
      production: item.production,
      children: children.length === 0 ? [{ kind: 'epsilon' }] : children,
    };
  }
  context.onPath.delete(item);
}

/**
 * The possible lists of children for the symbols before the dot of an item. An item with
 * the dot at 0 has none yet: one empty list. Otherwise, for each link: every list of its
 * predecessor (the dot one place before), extended with every tree of the link's cause.
 */
function* childSequences(context: TreeContext, item: EarleyItem): Generator<ParseTree[]> {
  if (item.dot === 0) {
    yield [];
    return;
  }
  for (const link of item.links) {
    for (const before of childSequences(context, link.predecessor)) {
      for (const child of causeTrees(context, link)) {
        yield [...before, child];
      }
    }
  }
}

/** The trees of what a link recognized: a token leaf, a child item, or an ε-subtree. */
function* causeTrees(context: TreeContext, link: Link): Generator<ParseTree> {
  if (link.kind === 'scan') {
    yield {
      kind: 'terminal',
      symbol: link.predecessor.production.rightSide[link.predecessor.dot] ?? '',
      tokenIndex: link.tokenIndex,
    };
  } else if (link.kind === 'complete') {
    yield* treesOfItem(context, link.child);
  } else {
    yield* epsilonTrees(context.grammar, context.nullable, link.symbol);
  }
}
