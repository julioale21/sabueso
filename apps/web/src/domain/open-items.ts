/**
 * The Earley items still open where a story fails (SPEC 03, step 18): a rejected story has no
 * tree, but the chart says which structures had started and what could have come next.
 * Concept: Earley items and sets (cards 11 and 12).
 */
import type { Chart, ParseError, Production } from '@sabueso/core';

export interface OpenItem {
  /** 'Planteo → Marco • Hecho, 0'. */
  text: string;
}

export interface OpenItems {
  /** The set the items are in: the position where the story failed. */
  set: number;
  /** Structures already started (something before the dot) that could not go on. */
  started: OpenItem[];
  /** Predicted rules that would have read one of the expected tags. */
  waiting: OpenItem[];
}

/** The dotted rule with its origin: 'Planteo → Marco • Hecho, 0'. */
function dottedText({
  production,
  dot,
  origin,
}: {
  production: Production;
  dot: number;
  origin: number;
}): string {
  const before = production.rightSide.slice(0, dot);
  const after = production.rightSide.slice(dot);
  const sides = [...before, '•', ...after].join(' ');
  return `${production.leftSide} → ${sides}, ${origin}`;
}

/** The open items of the set where the story failed, or null when Earley did not run. */
export function openItemsAt({
  chart,
  error,
}: {
  chart: Chart;
  error: ParseError;
}): OpenItems | null {
  const set = chart[error.position];
  if (set === undefined) {
    return null;
  }
  const expected = new Set(error.expected);
  const incomplete = set.items.filter((item) => item.dot < item.production.rightSide.length);
  return {
    set: error.position,
    started: incomplete.filter((item) => item.dot > 0).map((item) => ({ text: dottedText(item) })),
    waiting: incomplete
      .filter((item) => item.dot === 0 && expected.has(item.production.rightSide[0] ?? ''))
      .map((item) => ({ text: dottedText(item) })),
  };
}
