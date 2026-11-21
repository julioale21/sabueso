/**
 * One node of the tree as a pill: a nonterminal, a tag (terminal), an ε leaf, or a collapsed
 * subtree that only derives ε. Highlighted when it stands for the selected derivation step.
 */
import type { LayoutNode, LayoutNodeKind } from '../../tree-layout/layout';
import { NODE_HALF_HEIGHT, pillWidth, toPixels } from '../../tree-layout/geometry';
import { cx } from '../../utils/cx';

const pillStyles: Record<LayoutNodeKind, { box: string; text: string }> = {
  nonterminal: {
    box: 'fill-indigo-50 stroke-indigo-200 dark:fill-indigo-950 dark:stroke-indigo-800',
    text: 'fill-indigo-800 dark:fill-indigo-200',
  },
  terminal: {
    box: 'fill-slate-800 stroke-slate-800 dark:fill-slate-100 dark:stroke-slate-100',
    text: 'fill-white font-mono font-semibold dark:fill-slate-900',
  },
  epsilon: {
    box: 'fill-transparent stroke-transparent',
    text: 'fill-slate-400',
  },
  collapsed: {
    box: 'fill-slate-50 stroke-slate-300 [stroke-dasharray:3_3] dark:fill-slate-900 dark:stroke-slate-600',
    text: 'fill-slate-500 italic dark:fill-slate-400',
  },
};

const highlightBox = 'fill-amber-100 stroke-amber-500 dark:fill-amber-950 dark:stroke-amber-400';
const highlightText = 'fill-amber-900 dark:fill-amber-100';

export function TreeNode({ node, isHighlighted }: { node: LayoutNode; isHighlighted: boolean }) {
  const { left, top } = toPixels(node);
  const width = pillWidth(node.label);
  const styles = pillStyles[node.kind];
  return (
    <g data-node={node.id} data-highlighted={isHighlighted || undefined}>
      <rect
        x={left - width / 2}
        y={top - NODE_HALF_HEIGHT}
        width={width}
        height={NODE_HALF_HEIGHT * 2}
        rx={NODE_HALF_HEIGHT}
        strokeWidth={isHighlighted ? 2 : 1}
        className={cx('transition-colors duration-200', isHighlighted ? highlightBox : styles.box)}
      />
      <text
        x={left}
        y={top}
        textAnchor="middle"
        dominantBaseline="central"
        className={cx(
          'text-xs transition-colors duration-200',
          isHighlighted ? highlightText : styles.text,
        )}
      >
        {node.label}
      </text>
      {node.kind === 'collapsed' && (
        <text
          x={left}
          y={top + NODE_HALF_HEIGHT + 9}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-400 text-[10px]"
        >
          ⇒ ε
        </text>
      )}
    </g>
  );
}
