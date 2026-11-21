// The bounded searches: generation, witness of ambiguity and comparison (step 27).
import { describe, expect, it } from 'vitest';
import { findAmbiguityWitness } from '../../src/bounded/ambiguity.js';
import { compareLanguages } from '../../src/bounded/compare.js';
import { compareSentences, generateSentences } from '../../src/bounded/generate.js';
import { parseGrammarText } from '../../src/grammar-format/parser.js';
import { accepts, stringsUpTo } from '../helpers/language.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

const texts = (sentences: string[][]): string[] =>
  sentences.map((sentence) => sentence.join(' ') || 'ε');

describe('generateSentences', () => {
  it('G1 up to length 3 (computed by hand): 8 sentences, Hecho × Paso × REV', () => {
    expect(texts(generateSentences({ grammar: loadBuiltInGrammar('g1'), maxLength: 3 }))).toEqual([
      'CRI ATQ REV',
      'CRI INT REV',
      'CRI PIS REV',
      'CRI SOS REV',
      'HAL ATQ REV',
      'HAL INT REV',
      'HAL PIS REV',
      'HAL SOS REV',
    ]);
  });

  it('parentheses up to length 4: ε, ( ), ( ( ) ) and ( ) ( ), shortest first', () => {
    expect(
      texts(generateSentences({ grammar: loadBuiltInGrammar('parentheses'), maxLength: 4 })),
    ).toEqual(['ε', '( )', '( ( ) )', '( ) ( )']);
  });

  it.each([
    ['parentheses', ['(', ')'], 6],
    ['arithmetic', ['id', '+', '*', '(', ')'], 5],
    ['epsilon-trap', ['x'], 3],
    ['test-cyclic', ['a'], 3],
    ['test-empty', ['a'], 3],
  ])('%s: generates exactly the strings Earley accepts, up to length %#', (name, alphabet, k) => {
    const grammar = loadBuiltInGrammar(name);
    const accepted = stringsUpTo({ alphabet, maxLength: k }).filter((tokens) =>
      accepts({ grammar, tokens }),
    );
    expect(texts(generateSentences({ grammar, maxLength: k }))).toEqual(
      texts(accepted.sort(compareSentences)),
    );
  });

  it('G0 and G1 up to length 3: the generated sentences are the ones Earley accepts', () => {
    for (const name of ['g0', 'g1']) {
      const grammar = loadBuiltInGrammar(name);
      const accepted = stringsUpTo({ alphabet: [...grammar.terminals], maxLength: 3 }).filter(
        (tokens) => accepts({ grammar, tokens }),
      );
      expect(texts(generateSentences({ grammar, maxLength: 3 }))).toEqual(
        texts(accepted.sort(compareSentences)),
      );
    }
  });

  it('a recursion that adds no tokens hits the limit and throws', () => {
    const grammar = parseGrammarText({ text: "S -> S B | 'a'\nB -> ε\n", name: 'growing' });
    expect(() => generateSentences({ grammar, maxLength: 2, maxForms: 1000 })).toThrow(
      /without adding tokens/,
    );
  });
});

describe('findAmbiguityWitness', () => {
  it('B1: G0 has no witness up to length 3', () => {
    expect(findAmbiguityWitness({ grammar: loadBuiltInGrammar('g0'), maxLength: 3 })).toBeNull();
  });

  it('B2: up to length 4, the first witness of G0 is CRI SOS ATQ REV, with 2 trees', () => {
    expect(findAmbiguityWitness({ grammar: loadBuiltInGrammar('g0'), maxLength: 4 })).toEqual({
      sentence: ['CRI', 'SOS', 'ATQ', 'REV'],
      treeCount: 2n,
    });
  });

  it('B3: G1 has no witness up to length 7 (it is LL(1), so it has none at all)', () => {
    expect(findAmbiguityWitness({ grammar: loadBuiltInGrammar('g1'), maxLength: 7 })).toBeNull();
  });

  it('finds the classic witness of arithmetic-ambiguous, and infinitely many trees in a cycle', () => {
    expect(
      findAmbiguityWitness({ grammar: loadBuiltInGrammar('arithmetic-ambiguous'), maxLength: 5 }),
    ).toEqual({ sentence: ['id', '*', 'id', '*', 'id'], treeCount: 2n });
    expect(
      findAmbiguityWitness({ grammar: loadBuiltInGrammar('test-cyclic'), maxLength: 1 }),
    ).toEqual({ sentence: ['a'], treeCount: 'infinite' });
  });
});

describe('compareLanguages', () => {
  it('B4: up to length 3, only G0 has CRI DSC REV and HAL DSC REV; G1 has nothing of its own', () => {
    expect(
      compareLanguages({
        first: loadBuiltInGrammar('g0'),
        second: loadBuiltInGrammar('g1'),
        maxLength: 3,
      }),
    ).toEqual({
      onlyInFirst: [
        ['CRI', 'DSC', 'REV'],
        ['HAL', 'DSC', 'REV'],
      ],
      onlyInSecond: [],
      maxLength: 3,
    });
  });

  it('up to length 4 the difference grows, and G1 still has nothing G0 lacks (L(G1) ⊆ L(G0))', () => {
    const comparison = compareLanguages({
      first: loadBuiltInGrammar('g0'),
      second: loadBuiltInGrammar('g1'),
      maxLength: 4,
    });
    expect(comparison.onlyInFirst.length).toBeGreaterThan(2);
    expect(comparison.onlyInSecond).toEqual([]);
  });

  it('arithmetic and arithmetic-ambiguous generate the same sentences up to length 5', () => {
    const comparison = compareLanguages({
      first: loadBuiltInGrammar('arithmetic'),
      second: loadBuiltInGrammar('arithmetic-ambiguous'),
      maxLength: 5,
    });
    expect(comparison.onlyInFirst).toEqual([]);
    expect(comparison.onlyInSecond).toEqual([]);
  });
});
