/** How productions and sets of symbols are written on screen. */
import type { Production } from '@sabueso/core';

/** The right side of a production: 'Hecho MarcoOpc', or ε when empty. */
export function rightSideText(production: Production): string {
  return production.rightSide.length === 0 ? 'ε' : production.rightSide.join(' ');
}

/** 'A → Hecho MarcoOpc'. */
export function productionText(production: Production): string {
  return `${production.leftSide} → ${rightSideText(production)}`;
}

/** '{CRI, HAL, ε}': the members in the given order, or ∅. */
export function setText(members: Iterable<string>): string {
  const list = [...members];
  return list.length === 0 ? '∅' : `{${list.join(', ')}}`;
}
