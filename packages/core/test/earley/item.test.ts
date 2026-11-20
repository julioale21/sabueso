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
    const item = createItem(sum, 2, 0, 2);
    expect(item.key).toBe('0:2:0');
    expect(item.setIndex).toBe(2);
    expect(item.links).toEqual([]);
  });

  it('the key ignores the set index: it identifies the item inside one set', () => {
    expect(itemKey(sum, 1, 3)).toBe('0:1:3');
    expect(createItem(sum, 1, 3, 5).key).toBe(createItem(sum, 1, 3, 7).key);
  });
});

describe('nextSymbol and isComplete', () => {
  it('the symbol after the dot: a nonterminal, a terminal, or none at the end', () => {
    expect(nextSymbol(createItem(sum, 0, 0, 0))).toBe('E');
    expect(nextSymbol(createItem(sum, 1, 0, 1))).toBe('+');
    expect(nextSymbol(createItem(sum, 3, 0, 3))).toBeUndefined();
  });

  it('an item is complete when the dot is at the end', () => {
    expect(isComplete(createItem(sum, 2, 0, 2))).toBe(false);
    expect(isComplete(createItem(sum, 3, 0, 3))).toBe(true);
  });

  it('an ε-production is complete as soon as it is predicted', () => {
    expect(isComplete(createItem(empty, 0, 4, 4))).toBe(true);
    expect(nextSymbol(createItem(empty, 0, 4, 4))).toBeUndefined();
  });
});

describe('dottedRule and label', () => {
  it('writes the dot in its place', () => {
    expect(dottedRule(sum, 0)).toBe('E → • E + T');
    expect(dottedRule(sum, 2)).toBe('E → E + • T');
    expect(dottedRule(sum, 3)).toBe('E → E + T •');
  });

  it('an ε-production is written A → •', () => {
    expect(dottedRule(empty, 0)).toBe('S → •');
  });

  it('the label adds the origin, as in the traces: E → E + • T, 0', () => {
    expect(label(createItem(sum, 2, 0, 2))).toBe('E → E + • T, 0');
  });
});

describe('dottedRulesOf', () => {
  it('parentheses: S → ( S ) S gives 5 dotted rules and S → ε one, 6 in total', () => {
    expect(
      dottedRulesOf(parentheses).map(({ production, dot }) => dottedRule(production, dot)),
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
