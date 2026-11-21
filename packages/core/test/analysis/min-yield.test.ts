// Minimum yield: the length of the shortest string each nonterminal derives (step 8).
import { describe, expect, it } from 'vitest';
import { computeMinYield, minYieldOfSequence } from '../../src/analysis/min-yield.js';
import { computeNullable } from '../../src/analysis/nullable.js';
import { parseGrammarText } from '../../src/grammar-format/parser.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

describe('computeMinYield', () => {
  it.each(['g0', 'g1'])(
    'minYield(Relato) is 3 in %s: the shortest story is CRI PIS REV',
    (name) => {
      expect(computeMinYield(loadBuiltInGrammar(name)).get('Relato')).toBe(3);
    },
  );

  it('parentheses: minYield(S) is 0, because S → ε', () => {
    expect(computeMinYield(loadBuiltInGrammar('parentheses')).get('S')).toBe(0);
  });

  it('G1: each part of the story derives at least one event, each optional part none', () => {
    const minYield = computeMinYield(loadBuiltInGrammar('g1'));
    expect(minYield.get('Planteo')).toBe(1);
    expect(minYield.get('Investigacion')).toBe(1);
    expect(minYield.get('Desenlace')).toBe(1);
    expect(minYield.get('MarcoOpc')).toBe(0);
    expect(minYield.get('Marco')).toBe(1);
  });

  it('the nonterminals with minYield 0 are exactly the nullable ones', () => {
    for (const name of ['g0', 'g1', 'parentheses', 'epsilon-trap', 'arithmetic']) {
      const grammar = loadBuiltInGrammar(name);
      const zero = [...computeMinYield(grammar)].filter(([, value]) => value === 0);
      expect(new Set(zero.map(([symbol]) => symbol))).toEqual(computeNullable({ grammar }));
    }
  });

  it('takes the shortest alternative, even when it is not the first one', () => {
    const grammar = parseGrammarText("S -> 'a' 'a' 'a' | A\nA -> 'b' | 'b' 'b'\n", 'alternatives');
    expect(computeMinYield(grammar)).toEqual(
      new Map([
        ['S', 1],
        ['A', 1],
      ]),
    );
  });

  it('follows a chain of nonterminals: each level adds its own terminals', () => {
    const grammar = parseGrammarText("S -> 'x' A\nA -> 'y' B\nB -> 'z'\n", 'chain');
    expect(computeMinYield(grammar).get('S')).toBe(3);
  });

  it('a symbol that derives no string of terminals gets Infinity (test-useless: A)', () => {
    const minYield = computeMinYield(loadBuiltInGrammar('test-useless'));
    expect(minYield.get('A')).toBe(Infinity);
    expect(minYield.get('S')).toBe(1);
  });

  it('an empty language has minYield(S) = Infinity', () => {
    expect(computeMinYield(loadBuiltInGrammar('test-empty')).get('S')).toBe(Infinity);
  });

  it('a cycle does not loop forever: test-cyclic gives 1 for S and A', () => {
    expect(computeMinYield(loadBuiltInGrammar('test-cyclic'))).toEqual(
      new Map([
        ['S', 1],
        ['A', 1],
      ]),
    );
  });

  it('left recursion is no problem either: arithmetic gives 1 for E, T and F', () => {
    const minYield = computeMinYield(loadBuiltInGrammar('arithmetic'));
    expect([...minYield.values()]).toEqual([1, 1, 1]);
  });
});

describe('minYieldOfSequence', () => {
  const minYield = computeMinYield(loadBuiltInGrammar('g1'));

  it('adds the values of the symbols; a terminal counts 1', () => {
    expect(minYieldOfSequence(['CRI', 'Investigacion', 'Desenlace'], minYield)).toBe(3);
  });

  it('the empty sequence derives ε: 0', () => {
    expect(minYieldOfSequence([], minYield)).toBe(0);
  });

  it('nullable symbols add nothing', () => {
    expect(minYieldOfSequence(['Libres', 'Lineas', 'Desenlace'], minYield)).toBe(1);
  });
});
