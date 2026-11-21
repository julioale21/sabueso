// Differential tests (SPEC 02, section 9.4): Earley on G, CYK on FNC(G) and the pushdown
// automaton of G accept exactly the same strings of the exhaustive corpus.
import { describe, expect, it } from 'vitest';
import { allStrings, runDifferential } from '../src/differential/differential.js';
import { loadBuiltInGrammar } from './helpers/load.js';

describe('allStrings', () => {
  it('every string over {a, b} up to length 2: ε, a, b, aa, ab, ba, bb', () => {
    expect(allStrings({ alphabet: ['a', 'b'], maxLength: 2 })).toEqual([
      [],
      ['a'],
      ['b'],
      ['a', 'a'],
      ['a', 'b'],
      ['b', 'a'],
      ['b', 'b'],
    ]);
  });
});

describe('the three recognizers agree on the exhaustive corpus', () => {
  it.each([
    ['g1', 4, 41_371, 110],
    ['g0', 4, 41_371, 145],
  ])('%s: every string over the 14 tags up to length %i', (name, maxLength, strings, accepted) => {
    const report = runDifferential({ grammar: loadBuiltInGrammar(name), maxLength });
    expect(report.strings).toBe(strings);
    expect(report.accepted).toBe(accepted);
    expect(report.discrepancies).toEqual([]);
  });

  it.each([
    ['arithmetic', 5],
    ['arithmetic-ambiguous', 5],
    ['parentheses', 8],
  ])('%s: every string up to length %i', (name, maxLength) => {
    const report = runDifferential({ grammar: loadBuiltInGrammar(name), maxLength });
    expect(report.accepted).toBeGreaterThan(0);
    expect(report.discrepancies).toEqual([]);
  });

  it.each(['epsilon-trap', 'test-useless', 'test-empty', 'test-cyclic', 'meta'])(
    '%s: every string up to length 3',
    (name) => {
      expect(
        runDifferential({ grammar: loadBuiltInGrammar(name), maxLength: 3 }).discrepancies,
      ).toEqual([]);
    },
  );
});
