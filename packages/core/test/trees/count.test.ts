// Counting the trees of an input without building them (step 20).
import { describe, expect, it } from 'vitest';
import { recognize } from '../../src/earley/recognizer.js';
import { tokenizeSequence } from '../../src/input/sequence.js';
import { countTrees } from '../../src/trees/count.js';
import { catalan } from '../helpers/catalan.js';
import { parseTrees } from '../../src/trees/enumerate.js';
import { loadBuiltInGrammar, readL1 } from '../helpers/load.js';

function count({ grammarName, input }: { grammarName: string; input: string | string[] }) {
  const grammar = loadBuiltInGrammar(grammarName);
  const tokens = typeof input === 'string' ? tokenizeSequence(input) : input;
  return countTrees({ grammar, recognition: recognize({ grammar, tokens }) });
}

describe('the counts of table 9.1', () => {
  it.each([
    ['V1', 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP', 8n, 1n],
    ['V2', 'HAL PIS REV EPI', 1n, 1n],
    ['V3', 'CRI ENC SOS INT DSC PIS SOS ATQ REV CAP', 112n, 1n],
    ['A1', 'CRI SOS PIS INT REV', 4n, 1n],
    ['M1', 'CRI PIS REV', 1n, 1n],
    ['I5', 'CRI DSC REV', 1n, 0n],
    ['I7', 'CRI SOS DSC DSC REV', 4n, 0n],
    ['I1', 'CTX PER PIS REV', 0n, 0n],
  ])('%s: %i trees in G0, %i in G1', (_id, story, inG0, inG1) => {
    expect(count({ grammarName: 'g0', input: story })).toBe(inG0);
    expect(count({ grammarName: 'g1', input: story })).toBe(inG1);
  });
});

describe('L1 and the Catalan numbers', () => {
  it('L1 (CRI, 198 × PIS, REV) has C(197) trees in G0, a number of 115 digits', () => {
    const trees = count({ grammarName: 'g0', input: readL1() });
    expect(trees).toBe(catalan(197));
    expect(trees.toString()).toHaveLength(115);
  });

  it('L1 has exactly 1 tree in G1', () => {
    expect(count({ grammarName: 'g1', input: readL1() })).toBe(1n);
  });

  it.each([1, 2, 3, 4, 5, 8, 12])('CRI, %i × PIS, REV has C(n − 1) trees in G0', (n) => {
    const story = ['CRI', ...Array<string>(n).fill('PIS'), 'REV'];
    expect(count({ grammarName: 'g0', input: story })).toBe(catalan(n - 1));
  });

  it('catalan gives 1, 1, 2, 5, 14, 42 and the formula (2n)! / ((n + 1)! n!)', () => {
    expect([0, 1, 2, 3, 4, 5].map(catalan)).toEqual([1n, 1n, 2n, 5n, 14n, 42n]);
    const factorial = (n: number): bigint => (n <= 1 ? 1n : BigInt(n) * factorial(n - 1));
    expect(catalan(30)).toBe(factorial(60) / (factorial(31) * factorial(30)));
  });
});

describe('the count agrees with the enumeration of step 19', () => {
  it.each([
    ['g0', 'CRI SOS PIS INT REV'],
    ['g0', 'CRI ENC SOS INT DSC PIS SOS ATQ REV CAP'],
    ['arithmetic-ambiguous', 'id + id * id + id'],
    ['parentheses', '( ( ) ) ( )'],
  ])('%s, %s', (grammarName, input) => {
    const grammar = loadBuiltInGrammar(grammarName);
    const recognition = recognize({ grammar, tokens: tokenizeSequence(input) });
    expect(countTrees({ grammar, recognition })).toBe(
      BigInt(parseTrees({ grammar, recognition, limit: 100_000 }).length),
    );
  });
});

describe('special cases', () => {
  it('a cyclic grammar gives infinite: test-cyclic with a', () => {
    expect(count({ grammarName: 'test-cyclic', input: 'a' })).toBe('infinite');
  });

  it('a rejected input has 0 trees', () => {
    expect(count({ grammarName: 'g1', input: 'CRI REV' })).toBe(0n);
  });

  it('the empty input of parentheses has 1 tree', () => {
    expect(count({ grammarName: 'parentheses', input: '' })).toBe(1n);
  });

  it('the ambiguous arithmetic: id + id * id has 2 trees (the precedence is not fixed)', () => {
    expect(count({ grammarName: 'arithmetic-ambiguous', input: 'id + id * id' })).toBe(2n);
    expect(count({ grammarName: 'arithmetic', input: 'id + id * id' })).toBe(1n);
  });
});
