/**
 * Concept: the Earley sets S0 … Sn (the chart), one per position between tokens. Each set
 * is an append-only list with an index by key; walking it with a growing index is the
 * work queue of the algorithm.
 * Guide: docs/guides/13-earley-items-y-conjuntos.md
 */
import type { Production } from '../grammar/types.js';
import { createItem, itemKey, type EarleyItem, type Link } from './item.js';

export interface EarleySet {
  /** k: the set holds the items that reach position k of the input. */
  index: number;
  /** The items in the order they were added; the algorithm processes them in this order. */
  items: EarleyItem[];
  /** The same items by key, to find out in O(1) whether an item is already there. */
  byKey: Map<string, EarleyItem>;
}

export type Chart = EarleySet[];

/** The result of adding an item: the item in the set, and whether it is new. */
export interface AddedItem {
  item: EarleyItem;
  isNew: boolean;
}

/** A chart for an input of n tokens: n + 1 empty sets, S0 … Sn. */
export function createChart(tokenCount: number): Chart {
  return Array.from({ length: tokenCount + 1 }, (_, index) => ({
    index,
    items: [],
    byKey: new Map(),
  }));
}

/**
 * Adds the item (production, dot, origin) to the set, or finds it if it is already there.
 * Either way, the link (if any) is appended to the item's links, without looking for a
 * repeated one: the algorithm never builds the same link twice (SPEC 02, section 3.18).
 */
export function addItem({
  set,
  production,
  dot,
  origin,
  link,
}: {
  set: EarleySet;
  production: Production;
  dot: number;
  origin: number;
  link?: Link | undefined;
}): AddedItem {
  // An item is identified by productionId:dot:origin. If it is already in the set, it is not
  // added again (that keeps every set finite), but the new way of reaching it is kept as
  // one more link: that is how a set records that a part of the input has several trees.
  const existing = set.byKey.get(itemKey({ production, dot, origin }));
  const item = existing ?? createItem({ production, dot, origin, setIndex: set.index });
  if (link !== undefined) {
    item.links.push(link);
  }
  if (existing === undefined) {
    set.items.push(item);
    set.byKey.set(item.key, item);
  }
  return { item, isNew: existing === undefined };
}
