// Performance (SPEC 02, section 9.5): the criterion of the proposal on L1, a story of 200
// events, without trace and building a single tree.
import { describe, expect, it } from 'vitest';
import { parse } from '../src/parse.js';
import { benchmark } from '../src/performance/benchmark.js';
import { loadBuiltInGrammar, readL1 } from './helpers/load.js';

const elapsed = (work: () => void): number => {
  const started = performance.now();
  work();
  return performance.now() - started;
};

describe('performance with L1 (200 events)', () => {
  it('G1: recognition, tree, derivation and count in under 1000 ms (the criterion of the proposal)', () => {
    const grammar = loadBuiltInGrammar('g1');
    const input = readL1();
    let accepted = false;
    const ms = elapsed(() => {
      const result = parse({ grammar, input, options: { maxTrees: 1 } });
      accepted = result.accepted;
    });
    expect(accepted).toBe(true);
    expect(ms).toBeLessThan(1000);
  });

  it('G0: recognition and the bigint count in under 3000 ms', () => {
    const result = benchmark({ grammar: loadBuiltInGrammar('g0'), tokens: readL1() });
    expect(result.accepted).toBe(true);
    expect(String(result.treeCount)).toHaveLength(115);
    expect(result.recognitionMs + result.countMs).toBeLessThan(3000);
  });
});

describe('benchmark', () => {
  it('times each stage with the given clock and reports what each one produced', () => {
    let now = 0;
    const result = benchmark({
      grammar: loadBuiltInGrammar('g1'),
      tokens: ['CRI', 'PIS', 'REV'],
      clock: () => (now += 5),
    });
    expect(result).toEqual({
      events: 3,
      accepted: true,
      items: 54,
      recognitionMs: 5,
      treeMs: 5,
      derivationMs: 5,
      countMs: 5,
      treeCount: 1n,
    });
  });

  it('a rejected story has no tree and no derivation', () => {
    const result = benchmark({ grammar: loadBuiltInGrammar('g1'), tokens: ['CRI', 'REV'] });
    expect(result.accepted).toBe(false);
    expect(result.treeMs).toBeNull();
    expect(result.derivationMs).toBeNull();
    expect(result.treeCount).toBe(0n);
  });
});
