// The least fixed point by rounds, shared by the nullable, productive and reachable analyses.
import { describe, expect, it } from 'vitest';
import {
  leastFixedPoint,
  leastFixedPointOfSets,
  nonterminalsWithProductionThat,
} from '../../src/analysis/fixed-point.js';
import { parseGrammarText } from '../../src/grammar-format/parser.js';
import type { SymbolName } from '../../src/grammar/types.js';

/** A chain a → b → c → d: each round, the successors of the symbols known so far. */
const successors: Record<SymbolName, SymbolName[]> = { a: ['b'], b: ['c'], c: ['d'], d: [] };
const followChain = (known: ReadonlySet<SymbolName>): SymbolName[] =>
  [...known].flatMap((symbol) => successors[symbol] ?? []);

describe('leastFixedPoint', () => {
  it('applies the rule until a round adds nothing', () => {
    expect(leastFixedPoint(['a'], followChain)).toEqual(new Set(['a', 'b', 'c', 'd']));
  });

  it('a symbol found in a round only counts in the next one: one link per round', () => {
    const rounds: SymbolName[][] = [];
    leastFixedPoint(['a'], followChain, (_round, known) => rounds.push([...known].sort()));
    expect(rounds).toEqual([
      ['a', 'b'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c', 'd'],
      ['a', 'b', 'c', 'd'],
    ]);
  });

  it('numbers the rounds from 1, and the last one is the check', () => {
    const numbers: number[] = [];
    leastFixedPoint(['a'], followChain, (round) => numbers.push(round));
    expect(numbers).toEqual([1, 2, 3, 4]);
  });

  it('a rule that finds nothing stops after one round, with the start set', () => {
    const rounds: number[] = [];
    expect(
      leastFixedPoint(
        [],
        () => [],
        (round) => rounds.push(round),
      ),
    ).toEqual(new Set());
    expect(rounds).toEqual([1]);
  });

  it('repeated symbols from the rule do not count as new: it still stops', () => {
    expect(leastFixedPoint(['a'], () => ['a', 'a'])).toEqual(new Set(['a']));
  });

  it('the sets given to onIteration do not change in later rounds', () => {
    const snapshots: ReadonlySet<SymbolName>[] = [];
    leastFixedPoint(['a'], followChain, (_round, known) => snapshots.push(known));
    expect(snapshots.map((snapshot) => snapshot.size)).toEqual([2, 3, 4, 4]);
  });
});

describe('nonterminalsWithProductionThat', () => {
  it('returns the left sides of the productions that satisfy the condition', () => {
    const grammar = parseGrammarText("S -> A 'x' | ε\nA -> 'a'\n", 'small');
    const emptyRightSide = nonterminalsWithProductionThat(
      grammar.productions,
      (p) => p.rightSide.length === 0,
    );
    expect(emptyRightSide).toEqual(['S']);
  });
});

describe('leastFixedPointOfSets', () => {
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
    const result = leastFixedPointOfSets(start, copyRule);
    expect(result.get('a')).toEqual(new Set(['x']));
    expect(result.get('b')).toEqual(new Set(['x']));
  });

  it('a member found in a round only counts in the next one', () => {
    const sizes: number[] = [];
    leastFixedPointOfSets(start, copyRule, (_round, known) =>
      sizes.push(known.get('a')?.size ?? 0),
    );
    expect(sizes).toEqual([0, 1, 1]);
  });

  it('does not change the start sets', () => {
    leastFixedPointOfSets(start, copyRule);
    expect(start.get('a')).toEqual(new Set());
  });
});
