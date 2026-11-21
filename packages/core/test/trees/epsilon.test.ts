// The ε-trees of a nullable symbol, generated and counted from the grammar (step 18).
import { describe, expect, it } from 'vitest';
import { computeNullable } from '../../src/analysis/nullable.js';
import { parseGrammarText } from '../../src/grammar-format/parser.js';
import { countEpsilonTrees, epsilonTrees } from '../../src/trees/epsilon.js';
import { renderTree } from '../../src/trees/render.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

function setup(text: string) {
  const grammar = parseGrammarText({ text, name: 'test' });
  return { grammar, nullableSymbols: computeNullable(grammar) };
}

describe('G1', () => {
  const grammar = loadBuiltInGrammar('g1');
  const nullableSymbols = computeNullable(grammar);

  it.each([...nullableSymbols])('%s has exactly 1 ε-tree', (symbol) => {
    expect(countEpsilonTrees({ grammar, nullableSymbols, symbol })).toBe(1n);
    expect(epsilonTrees({ grammar, nullableSymbols, symbol })).toHaveLength(1);
  });

  it('the ε-tree of CuerpoLinea is CuerpoLinea → ε', () => {
    const [tree] = epsilonTrees({ grammar, nullableSymbols, symbol: 'CuerpoLinea' });
    expect(tree && renderTree(tree)).toBe('CuerpoLinea\n└─ ε');
  });
});

describe('symbols with several ε-trees', () => {
  const { grammar, nullableSymbols } = setup("S -> A A | 'x'\nA -> ε | B\nB -> ε | 'b'\n");

  it('A derives ε directly or through B: 2 trees', () => {
    expect(countEpsilonTrees({ grammar, nullableSymbols, symbol: 'A' })).toBe(2n);
  });

  it('S → A A multiplies: 2 × 2 = 4 trees, and all 4 are generated', () => {
    expect(countEpsilonTrees({ grammar, nullableSymbols, symbol: 'S' })).toBe(4n);
    const drawn = epsilonTrees({ grammar, nullableSymbols, symbol: 'S' }).map(renderTree);
    expect(drawn).toHaveLength(4);
    expect(new Set(drawn).size).toBe(4);
  });

  it('a production with a terminal is not an ε-production: S → x does not count', () => {
    expect(
      epsilonTrees({ grammar, nullableSymbols, symbol: 'S' }).every(
        (tree) => tree.kind === 'nonterminal' && tree.production.rightSide.length === 2,
      ),
    ).toBe(true);
  });
});

describe('cycles', () => {
  it('S → S | ε derives ε in infinitely many ways', () => {
    const { grammar, nullableSymbols } = setup('S -> S | ε\n');
    expect(countEpsilonTrees({ grammar, nullableSymbols, symbol: 'S' })).toBe('infinite');
  });

  it('with a cycle, only the trees without repeated symbols are listed', () => {
    const { grammar, nullableSymbols } = setup('S -> S | ε\n');
    expect(epsilonTrees({ grammar, nullableSymbols, symbol: 'S' }).map(renderTree)).toEqual([
      'S\n└─ ε',
    ]);
  });

  it('S → S S | ε is infinite too', () => {
    const { grammar, nullableSymbols } = setup('S -> S S | ε\n');
    expect(countEpsilonTrees({ grammar, nullableSymbols, symbol: 'S' })).toBe('infinite');
  });
});

describe('symbols that do not derive ε', () => {
  it('have 0 ε-trees', () => {
    const grammar = loadBuiltInGrammar('g1');
    const nullableSymbols = computeNullable(grammar);
    expect(countEpsilonTrees({ grammar, nullableSymbols, symbol: 'Relato' })).toBe(0n);
    expect(epsilonTrees({ grammar, nullableSymbols, symbol: 'Relato' })).toEqual([]);
  });
});
