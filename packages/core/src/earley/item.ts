/**
 * Concept: the Earley item (A → α • β, j), a dotted rule with an origin: "I am recognizing
 * A, I already recognized α starting at position j, and β is still missing".
 * Card: docs/concepts/11-earley-item.md
 */
import type { Grammar, Production, SymbolName } from '../grammar/types.js';

/**
 * Why the dot of an item moved one place: the predecessor is the same item with the dot one
 * place before, and the cause is what was recognized in between. An item with several links
 * was reached in several ways: that is how ambiguity shows up.
 */
export type Link =
  | { kind: 'scan'; predecessor: EarleyItem; tokenIndex: number }
  | { kind: 'complete'; predecessor: EarleyItem; child: EarleyItem }
  | { kind: 'nullable'; predecessor: EarleyItem; symbol: SymbolName };

export interface EarleyItem {
  production: Production;
  /** How many symbols of the right side were already recognized: the position of the dot. */
  dot: number;
  /** j: the position of the input where the recognition of this production started. */
  origin: number;
  /** The Earley set the item belongs to: the position of the input it has reached. */
  setIndex: number;
  /** 'productionId:dot:origin': two items with the same key are the same item. */
  key: string;
  /** How the dot got here; empty for a predicted item (dot 0). */
  links: Link[];
}

/** A new item with no links yet. */
export function createItem({
  production,
  dot,
  origin,
  setIndex,
}: {
  production: Production;
  dot: number;
  origin: number;
  setIndex: number;
}): EarleyItem {
  return {
    production,
    dot,
    origin,
    setIndex,
    key: itemKey({ production, dot, origin }),
    links: [],
  };
}

/**
 * The identity of an item inside a set. The set index is not part of it: every item of a
 * set has the same one.
 */
export function itemKey({
  production,
  dot,
  origin,
}: {
  production: Production;
  dot: number;
  origin: number;
}): string {
  return `${production.id}:${dot}:${origin}`;
}

/** The symbol right after the dot, or undefined when the dot is at the end. */
export function nextSymbol(item: EarleyItem): SymbolName | undefined {
  return item.production.rightSide[item.dot];
}

/** True when the dot is at the end: the whole right side was recognized. */
export function isComplete(item: EarleyItem): boolean {
  return item.dot === item.production.rightSide.length;
}

/** 'S → ( • S ) S': the production with the dot at the given position. */
export function dottedRule({ production, dot }: { production: Production; dot: number }): string {
  const symbols = [...production.rightSide];
  symbols.splice(dot, 0, '•');
  return `${production.leftSide} → ${symbols.join(' ')}`;
}

/** 'E → E + • T, 0': the dotted rule and the origin, as the traces and the chart show them. */
export function label(item: EarleyItem): string {
  return `${dottedRule({ production: item.production, dot: item.dot })}, ${item.origin}`;
}

/**
 * Every dotted rule of the grammar: one per production and dot position, so a production
 * with k symbols gives k + 1. Items only add an origin to these, which is why there are
 * finitely many of them and Earley always ends.
 */
export function dottedRulesOf(grammar: Grammar): { production: Production; dot: number }[] {
  return grammar.productions.flatMap((production) =>
    Array.from({ length: production.rightSide.length + 1 }, (_, dot) => ({ production, dot })),
  );
}
