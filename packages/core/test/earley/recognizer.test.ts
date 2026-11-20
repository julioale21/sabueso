// The Earley recognizer (steps 14 and 15): Predictor, Scanner, Completer and the ε fix.
import { describe, expect, it } from 'vitest';
import { dottedRule, isComplete, type EarleyItem } from '../../src/earley/item.js';
import { isEmptySpan, recognize } from '../../src/earley/recognizer.js';
import { tokenizeSequence } from '../../src/input/sequence.js';
import { g1ChartOfCriPisRev } from '../fixtures/g1-chart-cri-pis-rev.js';
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

describe('the ε fix of Aycock and Horspool (step 15)', () => {
  it('epsilon-trap: S → A A x with A → ε accepts x', () => {
    expect(accepts('epsilon-trap', 'x')).toBe(true);
  });

  it('with classicEpsilon, the bug of the classic algorithm comes back: x is rejected', () => {
    const grammar = loadBuiltInGrammar('epsilon-trap');
    expect(recognize(grammar, ['x'], { classicEpsilon: true }).accepted).toBe(false);
  });

  it('the fix adds S → A A • x with a nullable link; the classic algorithm never does', () => {
    const grammar = loadBuiltInGrammar('epsilon-trap');
    const rulesOf = (classicEpsilon: boolean) =>
      recognize(grammar, ['x'], { classicEpsilon }).chart[0]?.items.map((item) =>
        dottedRule(item.production, item.dot),
      );
    expect(rulesOf(false)).toContain('S → A A • x');
    expect(rulesOf(true)).not.toContain('S → A A • x');
    const advanced = recognize(grammar, ['x']).chart[0]?.items.find(
      (item) => dottedRule(item.production, item.dot) === 'S → A A • x',
    );
    expect(advanced?.links[0]).toMatchObject({ kind: 'nullable', symbol: 'A' });
  });

  it('parentheses accepts the empty input and ( ( ) ) ( )', () => {
    expect(accepts('parentheses', '')).toBe(true);
    expect(accepts('parentheses', '( ( ) ) ( )')).toBe(true);
  });
});

describe('G1: the stories of table 9.1', () => {
  it.each([
    ['V1', 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP'],
    ['V2', 'HAL PIS REV EPI'],
    ['V3', 'CRI ENC SOS INT DSC PIS SOS ATQ REV CAP'],
    ['A1', 'CRI SOS PIS INT REV'],
    ['M1', 'CRI PIS REV'],
  ])('%s is accepted', (_id, story) => {
    expect(accepts('g1', story)).toBe(true);
  });

  it.each([
    ['I1', 'CTX PER PIS REV'],
    ['I2', ''],
    ['I3', 'CRI REV'],
    ['I4', 'CRI PIS'],
    ['I5', 'CRI DSC REV'],
    ['I7', 'CRI SOS DSC DSC REV'],
  ])('%s is rejected (I5 and I7 are accepted by G0: L(G1) ⊊ L(G0))', (_id, story) => {
    expect(accepts('g1', story)).toBe(false);
  });

  it('L1, with 200 events, is accepted', () => {
    expect(recognize(loadBuiltInGrammar('g1'), readL1()).accepted).toBe(true);
  });
});

describe('the chart of CRI PIS REV with G1 is exactly the one of section 9.6', () => {
  const { chart } = recognize(loadBuiltInGrammar('g1'), tokenizeSequence('CRI PIS REV'));

  it('has 8, 19, 16 and 11 items', () => {
    expect(chart.map((set) => set.items.length)).toEqual([8, 19, 16, 11]);
  });

  it('item by item: rule, origin and how it got there', () => {
    const position = (item: EarleyItem) =>
      `S${item.setIndex}#${(chart[item.setIndex]?.items.indexOf(item) ?? -1) + 1}`;
    const how = (item: EarleyItem): string => {
      if (item.links.length === 0) {
        if (item.production.id === -1) return 'initial';
        return isComplete(item) && isEmptySpan(item) ? 'P (ignored)' : 'P';
      }
      return item.links
        .map((link) =>
          link.kind === 'nullable'
            ? 'ε'
            : `${link.kind === 'scan' ? 'S' : 'C'} from ${position(link.predecessor)}`,
        )
        .join('; ');
    };
    const actual = chart.flatMap((set) =>
      set.items.map((item) => ({
        set: set.index,
        item: dottedRule(item.production, item.dot),
        origin: item.origin,
        how: how(item),
      })),
    );
    expect(actual).toEqual(g1ChartOfCriPisRev);
  });
});

describe('links are never repeated (SPEC 02, section 3.18)', () => {
  it.each([
    ['g0', 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP'],
    ['g0', 'CRI SOS PIS INT REV'],
    ['g1', 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP'],
    ['g1', 'CRI ENC SOS INT DSC PIS SOS ATQ REV CAP'],
    ['parentheses', '( ( ) ) ( )'],
    ['epsilon-trap', 'x'],
  ])('%s with "%s": no item has the same (predecessor, cause) twice', (grammarName, story) => {
    const { chart } = recognize(loadBuiltInGrammar(grammarName), tokenizeSequence(story));
    for (const item of chart.flatMap((set) => set.items)) {
      const keys = item.links.map((link) => {
        const cause =
          link.kind === 'scan'
            ? `token ${link.tokenIndex}`
            : link.kind === 'complete'
              ? `child ${link.child.setIndex}:${link.child.key}`
              : `nullable ${link.symbol}`;
        return `${link.predecessor.setIndex}:${link.predecessor.key} ${cause}`;
      });
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
