// The Earley recognizer without the ε fix (step 14): Predictor, Scanner and Completer.
import { describe, expect, it } from 'vitest';
import { dottedRule } from '../../src/earley/item.js';
import { recognize } from '../../src/earley/recognizer.js';
import { tokenizeSequence } from '../../src/input/sequence.js';
import { loadBuiltInGrammar, readL1 } from '../helpers/load.js';

const g0 = loadBuiltInGrammar('g0');

function accepts(grammarName: string, story: string): boolean {
  return recognize(loadBuiltInGrammar(grammarName), tokenizeSequence(story)).accepted;
}

describe('G0 (no ε-productions): the stories of table 9.1', () => {
  it.each([
    ['V1', 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP'],
    ['V2', 'HAL PIS REV EPI'],
    ['V3', 'CRI ENC SOS INT DSC PIS SOS ATQ REV CAP'],
    ['A1', 'CRI SOS PIS INT REV'],
    ['M1', 'CRI PIS REV'],
    ['I5', 'CRI DSC REV'],
    ['I7', 'CRI SOS DSC DSC REV'],
  ])('%s is accepted', (_id, story) => {
    expect(accepts('g0', story)).toBe(true);
  });

  it.each([
    ['I1', 'CTX PER PIS REV'],
    ['I2', ''],
    ['I3', 'CRI REV'],
    ['I4', 'CRI PIS'],
  ])('%s is rejected', (_id, story) => {
    expect(accepts('g0', story)).toBe(false);
  });

  it('L1, with 200 events and C(197) trees, is accepted', () => {
    expect(recognize(g0, readL1()).accepted).toBe(true);
  });
});

describe('textbook grammars', () => {
  it.each([
    ['arithmetic', 'id + id * id', true],
    ['arithmetic', '( id + id ) * id', true],
    ['arithmetic', 'id + * id', false],
    ['arithmetic', 'id +', false],
    ['arithmetic-ambiguous', 'id + id * id', true],
    ['arithmetic-ambiguous', 'id id', false],
    ['parentheses', '( ( ) ) ( )', true],
    ['parentheses', '( ( )', false],
  ])('%s: "%s" → %s', (grammarName, input, expected) => {
    expect(accepts(grammarName, input)).toBe(expected);
  });

  it('left recursion is no problem: E → E + T is predicted once per set', () => {
    const { chart } = recognize(loadBuiltInGrammar('arithmetic'), ['id']);
    const predictedSums = chart[0]?.items.filter((item) => item.production.id === 0) ?? [];
    expect(predictedSums).toHaveLength(1);
  });
});

describe('the chart', () => {
  const { chart } = recognize(loadBuiltInGrammar('arithmetic'), tokenizeSequence('id + id'));
  const itemsOf = (index: number) =>
    chart[index]?.items.map((item) => `${dottedRule(item.production, item.dot)}, ${item.origin}`);

  it('S0 starts with $S → • E and the Predictor adds every production reachable at the start', () => {
    expect(itemsOf(0)).toEqual([
      '$S → • E, 0',
      'E → • E + T, 0',
      'E → • T, 0',
      'T → • T * F, 0',
      'T → • F, 0',
      'F → • ( E ), 0',
      'F → • id, 0',
    ]);
  });

  it('S1: the Scanner reads id and the Completer climbs up to E', () => {
    expect(itemsOf(1)).toEqual([
      'F → id •, 0',
      'T → F •, 0',
      'E → T •, 0',
      'T → T • * F, 0',
      '$S → E •, 0',
      'E → E • + T, 0',
    ]);
  });

  it('S2: after +, only E → E + • T survives, and T is predicted from origin 2', () => {
    expect(itemsOf(2)?.[0]).toBe('E → E + • T, 0');
    expect(itemsOf(2)?.slice(1)).toEqual([
      'T → • T * F, 2',
      'T → • F, 2',
      'F → • ( E ), 2',
      'F → • id, 2',
    ]);
  });

  it('each advanced item keeps a link to its predecessor and its cause', () => {
    const scanned = chart[1]?.items[0];
    expect(scanned?.links).toEqual([
      { kind: 'scan', predecessor: chart[0]?.items[6], tokenIndex: 0 },
    ]);
    const completed = chart[1]?.items[1];
    expect(completed?.links[0]).toMatchObject({ kind: 'complete', child: scanned });
  });

  it('a rejected input leaves an empty set: no possibility survives', () => {
    const rejected = recognize(loadBuiltInGrammar('arithmetic'), tokenizeSequence('id + * id'));
    expect(rejected.chart[3]?.items).toEqual([]);
  });
});

describe('the classic algorithm and ε (fixed in step 15)', () => {
  it('epsilon-trap: S → A A x with A → ε does not accept x yet', () => {
    // The Completer of A → •, 0 runs before S → A • A x is added, so the second A is
    // never completed. Step 15 adds the fix of Aycock and Horspool.
    expect(accepts('epsilon-trap', 'x')).toBe(false);
  });
});
