/**
 * Concept: FIRST and FOLLOW, the sets an LL(1) parser looks at to choose a production
 * with one token of lookahead.
 * Card: docs/concepts/05-first-follow.md
 */
import type { Grammar, SymbolName } from '../grammar/types.js';
import { lastRound, repeatRuleOnSetsUntilNoChange, type SetsBySymbol } from './fixed-point.js';

/** The member of a FIRST set that means "this can derive the empty string". */
export const EMPTY_STRING = 'ε';

/** The member of a FOLLOW set that means "this can be the last thing of the input". */
export const END_OF_INPUT = '$';

export interface FirstFollowSets {
  /** FIRST(A) for each nonterminal: the terminals A can start with, plus ε if A ⇒* ε. */
  first: SetsBySymbol;
  /** FOLLOW(A) for each nonterminal: the terminals that can come right after A, plus $. */
  follow: SetsBySymbol;
}

/** FIRST and FOLLOW together with every round of their fixed points (the --steps tables). */
export interface FirstFollowWithRounds extends FirstFollowSets {
  /** Every round of the FIRST fixed point; the last is `first`. */
  firstRounds: SetsBySymbol[];
  /** Every round of the FOLLOW fixed point; the last is `follow`. */
  followRounds: SetsBySymbol[];
}

/** FIRST and FOLLOW of every nonterminal; FIRST first, because FOLLOW is built from it. */
export function computeFirstFollow(grammar: Grammar): FirstFollowWithRounds {
  const firstRoundList = firstRounds(grammar);
  const first = lastRound(firstRoundList);
  const followRoundList = followRounds({ grammar, first });
  return {
    first,
    follow: lastRound(followRoundList),
    firstRounds: firstRoundList,
    followRounds: followRoundList,
  };
}

/**
 * FIRST(A) for every nonterminal A, by least fixed point: for each A → α, everything that
 * FIRST(α) has so far goes into FIRST(A). Returns every round; the last one is FIRST.
 */
export function firstRounds(grammar: Grammar): SetsBySymbol[] {
  // Each round, for every production A → X1…Xk: a sequence starts with what X1 starts
  // with; if X1 can vanish (ε ∈ FIRST(X1)), also with what X2 starts with, and so on.
  // If all of them can vanish, A can too, and ε goes into FIRST(A).
  return repeatRuleOnSetsUntilNoChange({
    start: emptySetFor(grammar.nonterminals),
    newMembersOfRound: (first) => newFirstMembers({ grammar, first }),
  });
}

/** The rule of a round of FIRST: a [A, member] pair for each member of FIRST(α), for each A → α. */
function newFirstMembers({
  grammar,
  first,
}: {
  grammar: Grammar;
  /** The FIRST sets known at the end of the previous round. */
  first: ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>;
}): [SymbolName, SymbolName][] {
  const pairs: [SymbolName, SymbolName][] = [];
  for (const production of grammar.productions) {
    for (const member of firstOfSequence({ symbols: production.rightSide, first })) {
      pairs.push([production.leftSide, member]);
    }
  }
  return pairs;
}

/**
 * FOLLOW(A) for every nonterminal A, by least fixed point. $ follows the start symbol, and
 * for each production A → α B β: FIRST(β) without ε follows B; if β can vanish, so does
 * everything that follows A. Returns every round; the last one is FOLLOW.
 */
export function followRounds({
  grammar,
  first,
}: {
  grammar: Grammar;
  /** FIRST of every nonterminal, already computed. */
  first: ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>;
}): SetsBySymbol[] {
  // FOLLOW looks to the right: what comes after B is what β starts with. When β can
  // vanish, B can be the last thing of A, so whatever comes after A comes after B too.
  const start = emptySetFor(grammar.nonterminals);
  start.get(grammar.start)?.add(END_OF_INPUT);
  return repeatRuleOnSetsUntilNoChange({
    start,
    newMembersOfRound: (follow) => newFollowMembers({ grammar, first, follow }),
  });
}

/** The rule of a round of FOLLOW: the [B, member] pairs of every production together. */
function newFollowMembers({
  grammar,
  first,
  follow,
}: {
  grammar: Grammar;
  first: ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>;
  /** The FOLLOW sets known at the end of the previous round. */
  follow: ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>;
}): [SymbolName, SymbolName][] {
  return grammar.productions.flatMap((production) => followPairs({ production, first, follow }));
}

/**
 * FIRST of a sequence X1…Xk: the members of FIRST(X1) except ε; if X1 can vanish, those of
 * X2 too, and so on. ε is included only if every Xi can vanish (or the sequence is empty).
 * A terminal is its own FIRST.
 */
export function firstOfSequence({
  symbols,
  first,
}: {
  symbols: readonly SymbolName[];
  /** FIRST of every nonterminal; a symbol not in the map is a terminal, its own FIRST. */
  first: ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>;
}): Set<SymbolName> {
  const result = new Set<SymbolName>();
  for (const symbol of symbols) {
    const firstOfSymbol = first.get(symbol) ?? new Set([symbol]);
    for (const member of firstOfSymbol) {
      if (member !== EMPTY_STRING) {
        result.add(member);
      }
    }
    if (!firstOfSymbol.has(EMPTY_STRING)) {
      return result;
    }
  }
  result.add(EMPTY_STRING);
  return result;
}

/** The [B, member] pairs one production A → α B β adds to FOLLOW, for each nonterminal B. */
function followPairs({
  production,
  first,
  follow,
}: {
  production: Grammar['productions'][number];
  first: ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>;
  /** The FOLLOW sets known at the end of the previous round. */
  follow: ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>;
}): [SymbolName, SymbolName][] {
  const pairs: [SymbolName, SymbolName][] = [];
  production.rightSide.forEach((symbol, position) => {
    if (!first.has(symbol)) {
      return; // a terminal has no FOLLOW
    }
    const rest = firstOfSequence({ symbols: production.rightSide.slice(position + 1), first });
    for (const member of rest) {
      if (member !== EMPTY_STRING) {
        pairs.push([symbol, member]);
      }
    }
    if (rest.has(EMPTY_STRING)) {
      for (const member of follow.get(production.leftSide) ?? []) {
        pairs.push([symbol, member]);
      }
    }
  });
  return pairs;
}

/** An empty set for each of the given symbols. */
function emptySetFor(symbols: Iterable<SymbolName>): SetsBySymbol {
  return new Map([...symbols].map((symbol) => [symbol, new Set<SymbolName>()]));
}
