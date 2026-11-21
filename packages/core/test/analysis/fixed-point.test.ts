// The least fixed point by rounds, shared by the nullable, productive and reachable analyses.
import { describe, expect, it } from 'vitest';
import {
  lastRound,
  repeatRuleUntilNoChange,
  repeatRuleOnSetsUntilNoChange,
} from '../../src/analysis/fixed-point.js';
import type { SymbolName } from '../../src/grammar/types.js';

/** A chain a → b → c → d: each round, the successors of the symbols known so far. */
const successors: Record<SymbolName, SymbolName[]> = { a: ['b'], b: ['c'], c: ['d'], d: [] };
const followChain = (known: ReadonlySet<SymbolName>): SymbolName[] =>
  [...known].flatMap((symbol) => successors[symbol] ?? []);

describe('repeatRuleUntilNoChange', () => {
  it('applies the rule until a round adds nothing; the last round is the result', () => {
    const rounds = repeatRuleUntilNoChange({ start: ['a'], newSymbolsOfRound: followChain });
    expect(lastRound(rounds)).toEqual(new Set(['a', 'b', 'c', 'd']));
  });

  it('a symbol found in a round only counts in the next one: one link per round', () => {
    const rounds = repeatRuleUntilNoChange({ start: ['a'], newSymbolsOfRound: followChain });
    expect(rounds.map((round) => [...round].sort())).toEqual([
      ['a', 'b'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c', 'd'],
      ['a', 'b', 'c', 'd'],
    ]);
  });

  it('a rule that finds nothing stops after one round, with the start set', () => {
    expect(repeatRuleUntilNoChange({ start: [], newSymbolsOfRound: () => [] })).toEqual([
      new Set(),
    ]);
  });

  it('repeated symbols from the rule do not count as new: it still stops', () => {
    const rounds = repeatRuleUntilNoChange({ start: ['a'], newSymbolsOfRound: () => ['a', 'a'] });
    expect(lastRound(rounds)).toEqual(new Set(['a']));
  });

  it('each round is its own set: later rounds do not change earlier ones', () => {
    const rounds = repeatRuleUntilNoChange({ start: ['a'], newSymbolsOfRound: followChain });
    expect(rounds.map((round) => round.size)).toEqual([2, 3, 4, 4]);
  });
});

describe('lastRound', () => {
  it('returns the last round', () => {
    expect(lastRound([new Set(['a']), new Set(['a', 'b'])])).toEqual(new Set(['a', 'b']));
  });

  it('throws on an empty list: a fixed point always has at least one round', () => {
    expect(() => lastRound([])).toThrow();
  });
});

describe('repeatRuleOnSetsUntilNoChange', () => {
  /** Each round, a copies what b has, and b copies what c has. */
  const copyRule = (known: ReadonlyMap<string, ReadonlySet<string>>): [string, string][] => [
    ...[...(known.get('b') ?? [])].map((member): [string, string] => ['a', member]),
    ...[...(known.get('c') ?? [])].map((member): [string, string] => ['b', member]),
  ];
  const start = new Map([
    ['a', new Set<string>()],
    ['b', new Set<string>()],
    ['c', new Set(['x'])],
  ]);

  it('grows every set until no set changes', () => {
    const result = lastRound(repeatRuleOnSetsUntilNoChange({ start, newMembersOfRound: copyRule }));
    expect(result.get('a')).toEqual(new Set(['x']));
    expect(result.get('b')).toEqual(new Set(['x']));
  });

  it('a member found in a round only counts in the next one', () => {
    const rounds = repeatRuleOnSetsUntilNoChange({ start, newMembersOfRound: copyRule });
    expect(rounds.map((round) => round.get('a')?.size ?? 0)).toEqual([0, 1, 1]);
  });

  it('does not change the start sets', () => {
    repeatRuleOnSetsUntilNoChange({ start, newMembersOfRound: copyRule });
    expect(start.get('a')).toEqual(new Set());
  });
});
