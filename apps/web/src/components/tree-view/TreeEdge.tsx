/** The straight line from a node to one of its children, border to border. */
import type { LayoutNode } from '../../tree-layout/layout';
import { NODE_HALF_HEIGHT, toPixels } from '../../tree-layout/geometry';

export function TreeEdge({ from, to }: { from: LayoutNode; to: LayoutNode }) {
  const start = toPixels(from);
  const end = toPixels(to);
  return (
    <line
      x1={start.left}
      y1={start.top + NODE_HALF_HEIGHT}
      x2={end.left}
      y2={end.top - NODE_HALF_HEIGHT}
      strokeWidth={1.5}
      className="stroke-slate-300 motion-safe:animate-node-in dark:stroke-slate-600"
    />
  );
}
