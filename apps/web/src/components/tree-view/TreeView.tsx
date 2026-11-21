/**
 * The parse tree drawn in SVG, like on the blackboard (SPEC 03, section 3.3). The positions
 * come from layoutTree; the tree itself comes from the core. Concept: parse trees (card 18).
 */
import type { ParseTree } from '@sabueso/core';
import { canvasSize } from '../../tree-layout/geometry';
import { allNodes, layoutTree, type LayoutNode } from '../../tree-layout/layout';
import { TreeEdge } from './TreeEdge';
import { TreeNode } from './TreeNode';

/** Whether a node stands for the given expansion of the leftmost derivation. */
function standsFor(node: LayoutNode, expansion: number | null): boolean {
  return (
    expansion !== null &&
    node.expansions !== null &&
    node.expansions.first <= expansion &&
    expansion <= node.expansions.last
  );
}

export function TreeView({
  tree,
  collapseEpsilon,
  highlightedExpansion,
}: {
  tree: ParseTree;
  collapseEpsilon: boolean;
  /** The expansion (0-based, in preorder) to highlight, or null. */
  highlightedExpansion: number | null;
}) {
  const layout = layoutTree({ tree, collapseEpsilon });
  const nodes = allNodes(layout.root);
  const size = canvasSize(layout);
  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Árbol de derivación"
        width={size.width}
        height={size.height}
        className="block"
      >
        {nodes.flatMap((node) =>
          node.children.map((child) => <TreeEdge key={child.id} from={node} to={child} />),
        )}
        {nodes.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            isHighlighted={standsFor(node, highlightedExpansion)}
          />
        ))}
      </svg>
    </div>
  );
}
