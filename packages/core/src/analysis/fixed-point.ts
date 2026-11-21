/**
 * Concept: the least fixed point, the scheme behind most grammar analyses (nullable,
 * productive, reachable…): start from a set and apply a rule until nothing changes.
 * Reference: Hopcroft 7.1; SPEC 02, sections 3.7 and 3.8.
 * Card: docs/concepts/07-nullable-symbols.md
 */
import type { Production, SymbolName } from '../grammar/types.js';

/** Called after each round with its number (from 1) and every symbol known so far. */
export type FixedPointObserver = (round: number, known: ReadonlySet<SymbolName>) => void;

/**
 * Applies the rule round after round until it adds nothing new. Starts from `start` and, each
 * round, adds the symbols the rule finds using only what was known at the end of the previous
 * round. Stops when a round adds nothing, and returns that set: in the theory, the least fixed
 * point of the rule.
 *
 * It always stops: the set only grows, and the rule can only add symbols of a finite set.
 */
export function repeatRuleUntilNoChange({
  start,
  newSymbolsOfRound,
  onIteration,
}: {
  /** The symbols known before the first round: the base of the induction (often ∅). */
  start: Iterable<SymbolName>;
  /** The rule of a round: the symbols to add, given what was known before it. */
  newSymbolsOfRound: (knownBefore: ReadonlySet<SymbolName>) => Iterable<SymbolName>;
  /** Called after each round, if given. */
  onIteration?: FixedPointObserver | undefined;
}): Set<SymbolName> {
  // Least fixed point: start from `start` (almost always ∅); each round applies the rule
  // to what was known at the end of the previous round (knownBefore). New symbols go to
  // another set (knownAfter), so a symbol found in this round only counts in the
  // next one: round i holds the symbols that need i applications of the rule.
  // It stops because the set only grows and is bounded (at most |N| + 1 rounds).
  let knownBefore = new Set(start);
  for (let round = 1; ; round++) {
    const knownAfter = new Set([...knownBefore, ...newSymbolsOfRound(knownBefore)]);
    onIteration?.(round, knownAfter);
    if (knownAfter.size === knownBefore.size) {
      return knownAfter; // nothing new: fixed point
    }
    knownBefore = knownAfter;
  }
}

/**
 * The nonterminals A with some production A → α that satisfies the condition: the usual rule
 * of a round (A is nullable if some A → α has every symbol of α nullable).
 */
export function nonterminalsWithProductionThat(
  productions: readonly Production[],
  condition: (production: Production) => boolean,
): SymbolName[] {
  return productions.filter(condition).map((production) => production.leftSide);
}

/** One set per symbol, as FIRST and FOLLOW are. */
export type SetsBySymbol = Map<SymbolName, Set<SymbolName>>;

/** Called after each round with its number (from 1) and every set as known so far. */
export type SetsFixedPointObserver = (
  round: number,
  known: ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>,
) => void;

/**
 * The same least fixed point when there is one set per symbol (FIRST, FOLLOW): starts from
 * `start` and, each round, adds the [symbol, member] pairs the rule finds using only the
 * sets known at the end of the previous round. Stops when a round adds no member to any set.
 */
export function leastFixedPointOfSets(
  start: ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>,
  newMembersOfRound: (
    knownBefore: ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>,
  ) => Iterable<[SymbolName, SymbolName]>,
  onIteration?: SetsFixedPointObserver,
): SetsBySymbol {
  // Same scheme as repeatRuleUntilNoChange, with one set per symbol growing at once. A round
  // copies every set and adds what the rule finds; if the total size did not change,
  // no set changed: fixed point.
  let knownBefore = copySets(start);
  for (let round = 1; ; round++) {
    const knownAfter = copySets(knownBefore);
    for (const [symbol, member] of newMembersOfRound(knownBefore)) {
      knownAfter.get(symbol)?.add(member);
    }
    onIteration?.(round, knownAfter);
    if (totalSize(knownAfter) === totalSize(knownBefore)) {
      return knownAfter; // nothing new in any set: fixed point
    }
    knownBefore = knownAfter;
  }
}

/** A deep copy: a new set for each symbol, so later rounds never change earlier ones. */
function copySets(sets: ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>): SetsBySymbol {
  return new Map([...sets].map(([symbol, members]) => [symbol, new Set(members)]));
}

/** How many members all the sets have together. */
function totalSize(sets: ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>): number {
  return [...sets.values()].reduce((total, members) => total + members.size, 0);
}
