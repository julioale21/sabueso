// The Earley item (A → α • β, j) and its helpers (step 13).
import { describe, expect, it } from 'vitest';
import {
  createItem,
  dottedRule,
  dottedRulesOf,
  isComplete,
  itemKey,
  label,
  nextSymbol,
} from '../../src/earley/item.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

const arithmetic = loadBuiltInGrammar('arithmetic');
/** E → E + T, production 0 of arithmetic. */
const sum = arithmetic.productions[0]!;
const parentheses = loadBuiltInGrammar('parentheses');
/** S → ε, production 1 of parentheses. */
const empty = parentheses.productions[1]!;

describe('createItem and itemKey', () => {
  it('builds an item with its key productionId:dot:origin and no links', () => {
    const item = createItem({ production: sum, dot: 2, origin: 0, setIndex: 2 });
    expect(item.key).toBe('0:2:0');
    expect(item.setIndex).toBe(2);
    expect(item.links).toEqual([]);
  });

  it('the key ignores the set index: it identifies the item inside one set', () => {
    expect(itemKey({ production: sum, dot: 1, origin: 3 })).toBe('0:1:3');
    expect(createItem({ production: sum, dot: 1, origin: 3, setIndex: 5 }).key).toBe(
      createItem({ production: sum, dot: 1, origin: 3, setIndex: 7 }).key,
    );
  });
});

describe('nextSymbol and isComplete', () => {
  it('the symbol after the dot: a nonterminal, a terminal, or none at the end', () => {
    expect(nextSymbol(createItem({ production: sum, dot: 0, origin: 0, setIndex: 0 }))).toBe('E');
    expect(nextSymbol(createItem({ production: sum, dot: 1, origin: 0, setIndex: 1 }))).toBe('+');
    expect(
      nextSymbol(createItem({ production: sum, dot: 3, origin: 0, setIndex: 3 })),
    ).toBeUndefined();
  });

  it('an item is complete when the dot is at the end', () => {
    expect(isComplete(createItem({ production: sum, dot: 2, origin: 0, setIndex: 2 }))).toBe(false);
    expect(isComplete(createItem({ production: sum, dot: 3, origin: 0, setIndex: 3 }))).toBe(true);
  });

  it('an ε-production is complete as soon as it is predicted', () => {
    expect(isComplete(createItem({ production: empty, dot: 0, origin: 4, setIndex: 4 }))).toBe(
      true,
    );
    expect(
      nextSymbol(createItem({ production: empty, dot: 0, origin: 4, setIndex: 4 })),
    ).toBeUndefined();
  });
});

describe('dottedRule and label', () => {
  it('writes the dot in its place', () => {
    expect(dottedRule({ production: sum, dot: 0 })).toBe('E → • E + T');
    expect(dottedRule({ production: sum, dot: 2 })).toBe('E → E + • T');
    expect(dottedRule({ production: sum, dot: 3 })).toBe('E → E + T •');
  });

  it('an ε-production is written A → •', () => {
    expect(dottedRule({ production: empty, dot: 0 })).toBe('S → •');
  });

  it('the label adds the origin, as in the traces: E → E + • T, 0', () => {
    expect(label(createItem({ production: sum, dot: 2, origin: 0, setIndex: 2 }))).toBe(
      'E → E + • T, 0',
    );
  });
});

describe('dottedRulesOf', () => {
  it('parentheses: S → ( S ) S gives 5 dotted rules and S → ε one, 6 in total', () => {
    expect(
      dottedRulesOf(parentheses).map(({ production, dot }) => dottedRule({ production, dot })),
    ).toEqual([
      'S → • ( S ) S',
      'S → ( • S ) S',
      'S → ( S • ) S',
      'S → ( S ) • S',
      'S → ( S ) S •',
      'S → •',
    ]);
  });

  it('G1: one dotted rule per production and dot position', () => {
    const g1 = loadBuiltInGrammar('g1');
    const expected = g1.productions.reduce((total, p) => total + p.rightSide.length + 1, 0);
    expect(dottedRulesOf(g1)).toHaveLength(expected);
  });
});
