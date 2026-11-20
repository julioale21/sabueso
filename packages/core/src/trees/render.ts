/**
 * Concept: a parse tree drawn as text, one node per line, with ├─ and └─ for the branches.
 * Reference: SPEC 02, section 3.21 (render) and step 19.
 * Card: docs/concepts/18-backpointers-and-trees.md
 */
import type { ParseTree } from './tree.js';

/**
 * The tree as text:
 *
 *   Hecho
 *   ├─ CRI
 *   └─ HallazgoOpc
 *      └─ ε
 */
export function renderTree(tree: ParseTree): string {
  return renderLines(tree, '', '').join('\n');
}

/**
 * The lines of a node and its descendants. `prefix` goes before the node itself;
 * `childPrefix` before everything below it, so the vertical bars of the open branches
 * continue down the page.
 */
function renderLines(tree: ParseTree, prefix: string, childPrefix: string): string[] {
  const lines = [`${prefix}${nodeLabel(tree)}`];
  const children = tree.kind === 'nonterminal' ? tree.children : [];
  children.forEach((child, index) => {
    const isLast = index === children.length - 1;
    lines.push(
      ...renderLines(
        child,
        `${childPrefix}${isLast ? '└─ ' : '├─ '}`,
        `${childPrefix}${isLast ? '   ' : '│  '}`,
      ),
    );
  });
  return lines;
}

/** What a node shows: its symbol, or ε for an empty leaf. */
function nodeLabel(tree: ParseTree): string {
  return tree.kind === 'epsilon' ? 'ε' : tree.symbol;
}
