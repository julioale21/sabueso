/**
 * Where to draw each node of a parse tree (SPEC 03, section 3.3): geometry, not language
 * theory. Leaves get one column each, left to right; every inner node sits centered over its
 * first and last child; the row is the depth. So no two nodes overlap and every parent is
 * centered. Optionally, a subtree that only derives ε is drawn as one dimmed node.
 */
import type { ParseTree } from '@sabueso/core';

export type LayoutNodeKind = 'terminal' | 'nonterminal' | 'epsilon' | 'collapsed';

/**
 * Which steps of the leftmost derivation a node stands for: its expansion number in preorder
 * (the order of the leftmost derivation, card 20). A collapsed node stands for every expansion
 * of its hidden subtree, from first to last.
 */
export interface ExpansionRange {
  first: number;
  last: number;
}

export interface LayoutNode {
  /** The path from the root: '0', '0.1', '0.1.2'. */
  id: string;
  label: string;
  kind: LayoutNodeKind;
  /** Column, in grid units (a leaf per column). */
  x: number;
  /** Row: the depth, the root at 0. */
  y: number;
  expansions: ExpansionRange | null;
  children: LayoutNode[];
}

export interface TreeLayout {
  root: LayoutNode;
  /** Columns: one per leaf. */
  width: number;
  /** Rows: the deepest node plus one. */
  height: number;
  leafCount: number;
}

/** Whether a subtree has no terminal at all: everything in it derives ε. */
export function derivesOnlyEpsilon(tree: ParseTree): boolean {
  if (tree.kind === 'terminal') {
    return false;
  }
  return tree.kind === 'epsilon' || tree.children.every(derivesOnlyEpsilon);
}

/** How many expansions (inner nodes) a subtree has. */
function countExpansions(tree: ParseTree): number {
  return tree.kind === 'nonterminal'
    ? 1 + tree.children.reduce((total, child) => total + countExpansions(child), 0)
    : 0;
}

/** The layout of a tree; with collapseEpsilon, the ε-only subtrees become one node. */
export function layoutTree({
  tree,
  collapseEpsilon,
}: {
  tree: ParseTree;
  collapseEpsilon: boolean;
}): TreeLayout {
  // Postorder: children before their parent, so a parent can be centered over children that
  // already have a column. The counters walk the tree once: the next free column for a leaf,
  // and the next expansion number in preorder.
  let nextColumn = 0;
  let nextExpansion = 0;
  let deepest = 0;

  const place = ({
    node,
    id,
    depth,
  }: {
    node: ParseTree;
    id: string;
    depth: number;
  }): LayoutNode => {
    deepest = Math.max(deepest, depth);
    if (node.kind !== 'nonterminal') {
      return {
        id,
        label: node.kind === 'terminal' ? node.symbol : 'ε',
        kind: node.kind,
        x: nextColumn++,
        y: depth,
        expansions: null,
        children: [],
      };
    }
    const first = nextExpansion;
    if (collapseEpsilon && derivesOnlyEpsilon(node)) {
      nextExpansion += countExpansions(node);
      return {
        id,
        label: node.symbol,
        kind: 'collapsed',
        x: nextColumn++,
        y: depth,
        expansions: { first, last: nextExpansion - 1 },
        children: [],
      };
    }
    nextExpansion++;
    const children = node.children.map((child, index) =>
      place({ node: child, id: `${id}.${index}`, depth: depth + 1 }),
    );
    const firstChild = children[0];
    const lastChild = children.at(-1);
    return {
      id,
      label: node.symbol,
      kind: 'nonterminal',
      x:
        firstChild === undefined || lastChild === undefined
          ? nextColumn++
          : (firstChild.x + lastChild.x) / 2,
      y: depth,
      expansions: { first, last: first },
      children,
    };
  };

  const root = place({ node: tree, id: '0', depth: 0 });
  return { root, width: nextColumn, height: deepest + 1, leafCount: nextColumn };
}

/** Every node of a layout, parents before children: handy for drawing and for tests. */
export function allNodes(node: LayoutNode): LayoutNode[] {
  return [node, ...node.children.flatMap(allNodes)];
}
