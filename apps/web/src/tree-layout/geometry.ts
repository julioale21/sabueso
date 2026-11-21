/** From grid units (columns and rows of the layout) to pixels (SPEC 03, section 3.3). */
export const COLUMN_WIDTH = 116;
export const ROW_HEIGHT = 64;
export const MARGIN = 24;

export function toPixels({ x, y }: { x: number; y: number }): { left: number; top: number } {
  return { left: MARGIN + x * COLUMN_WIDTH + COLUMN_WIDTH / 2, top: MARGIN + y * ROW_HEIGHT };
}

/** The size of the drawing for a layout of `width` columns and `height` rows. */
export function canvasSize({ width, height }: { width: number; height: number }) {
  return {
    width: MARGIN * 2 + width * COLUMN_WIDTH,
    height: MARGIN * 2 + (height - 1) * ROW_HEIGHT + 16,
  };
}

/** Half the height of a node's pill: edges start and end at its border. */
export const NODE_HALF_HEIGHT = 11;

/** An approximate pill width for a label, so the text fits inside. */
export function pillWidth(label: string): number {
  return Math.max(36, label.length * 7 + 18);
}
