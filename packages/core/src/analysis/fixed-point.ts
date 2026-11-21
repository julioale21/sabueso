/**
 * Concept: the least fixed point, the scheme behind most grammar analyses (nullable,
 * productive, reachable…): start from a set and apply a rule until nothing changes.
 * Reference: Hopcroft 7.1; SPEC 02, sections 3.7 and 3.8.
 * Card: docs/concepts/07-nullable-symbols.md
 */
import type { SymbolName } from '../grammar/types.js';

/**
 * Applies the rule round after round until it adds nothing new. Starts from `start` and, each
 * round, adds the symbols the rule finds using only what was known at the end of the previous
 * round. Stops when a round adds nothing.
 *
 * Returns every round in order: round i is what was known after i applications of the rule
 * (the --steps tables print them). The last round added nothing: it is the result, in the
 * theory the least fixed point of the rule (see lastRound).
 *
 * It always stops: the set only grows, and the rule can only add symbols of a finite set.
 */
export function repeatRuleUntilNoChange({
  start,
  newSymbolsOfRound,
}: {
  /** The symbols known before the first round: the base of the induction (often ∅). */
  start: Iterable<SymbolName>;
  /** The rule of a round: the symbols to add, given what was known before it. */
  newSymbolsOfRound: (knownBefore: ReadonlySet<SymbolName>) => Iterable<SymbolName>;
}): Set<SymbolName>[] {
  // Least fixed point: start from `start` (almost always ∅); each round applies the rule
  // to what was known at the end of the previous round (knownBefore). New symbols go to
  // another set (knownAfter), so a symbol found in this round only counts in the
  // next one: round i holds the symbols that need i applications of the rule.
  // It stops because the set only grows and is bounded (at most |N| + 1 rounds).
  const rounds: Set<SymbolName>[] = [];
  let knownBefore = new Set(start);
  for (;;) {
    const knownAfter = new Set([...knownBefore, ...newSymbolsOfRound(knownBefore)]);
    rounds.push(knownAfter);
    if (knownAfter.size === knownBefore.size) {
      return rounds; // nothing new: fixed point
    }
    knownBefore = knownAfter;
  }
}

/** The result of a fixed point: its last round, the one that added nothing. */
export function lastRound<T>(rounds: readonly T[]): T {
  const last = rounds[rounds.length - 1];
  if (last === undefined) {
    throw new Error('A fixed point always has at least one round');
  }
  return last;
}

/** One set per symbol, as FIRST and FOLLOW are. */
export type SetsBySymbol = Map<SymbolName, Set<SymbolName>>;

/**
 * repeatRuleUntilNoChange when there is one set per symbol (FIRST, FOLLOW): starts from
 * `start` and, each round, adds the [symbol, member] pairs the rule finds using only the
 * sets known at the end of the previous round. Stops when a round adds no member to any set.
 * Returns every round in order; the last one is the result (the least fixed point).
 */
export function repeatRuleOnSetsUntilNoChange({
  start,
  newMembersOfRound,
}: {
  /** The set of each symbol before the first round (FOLLOW starts with $ in FOLLOW(S)). */
  start: ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>;
  /** The rule of a round: [symbol, member] pairs to add, given the sets known before it. */
  newMembersOfRound: (
    knownBefore: ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>,
  ) => Iterable<[SymbolName, SymbolName]>;
}): SetsBySymbol[] {
  // Same scheme as repeatRuleUntilNoChange, with one set per symbol growing at once. A round
  // copies every set and adds what the rule finds; if the total size did not change,
  // no set changed: fixed point.
  const rounds: SetsBySymbol[] = [];
  let knownBefore = copySets(start);
  for (;;) {
    const knownAfter = copySets(knownBefore);
    for (const [symbol, member] of newMembersOfRound(knownBefore)) {
      knownAfter.get(symbol)?.add(member);
    }
    rounds.push(knownAfter);
    if (totalSize(knownAfter) === totalSize(knownBefore)) {
      return rounds; // nothing new in any set: fixed point
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
