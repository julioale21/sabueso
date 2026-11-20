// The parse trees of an input, rebuilt from the links of the Earley items (step 19).
import { describe, expect, it } from 'vitest';
import { recognize } from '../../src/earley/recognizer.js';
import { tokenizeSequence } from '../../src/input/sequence.js';
import { enumerateTrees, parseTrees } from '../../src/trees/enumerate.js';
import { renderTree } from '../../src/trees/render.js';
import type { ParseTree } from '../../src/trees/tree.js';
import { loadBuiltInGrammar, readL1 } from '../helpers/load.js';

function treesOf(grammarName: string, input: string, limit = 1000): ParseTree[] {
  const grammar = loadBuiltInGrammar(grammarName);
  return parseTrees(grammar, recognize(grammar, tokenizeSequence(input)), limit);
}

/** The leaves of a tree, left to right, without ε: the string the tree derives (its yield). */
function leaves(tree: ParseTree): string[] {
  if (tree.kind === 'terminal') return [tree.symbol];
  if (tree.kind === 'epsilon') return [];
  return tree.children.flatMap(leaves);
}

describe('A1 CRI SOS PIS INT REV', () => {
  it('has 4 different trees in G0', () => {
    const trees = treesOf('g0', 'CRI SOS PIS INT REV');
    expect(trees).toHaveLength(4);
    expect(new Set(trees.map(renderTree)).size).toBe(4);
  });

  it('with a limit of 2, gives 2', () => {
    expect(treesOf('g0', 'CRI SOS PIS INT REV', 2)).toHaveLength(2);
  });

  it('has exactly 1 tree in G1, which is unambiguous', () => {
    expect(treesOf('g1', 'CRI SOS PIS INT REV')).toHaveLength(1);
  });
});

describe('the counts of table 9.1, by enumerating', () => {
  it.each([
    ['g0', 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP', 8],
    ['g0', 'CRI ENC SOS INT DSC PIS SOS ATQ REV CAP', 112],
    ['g0', 'CRI PIS REV', 1],
    ['g1', 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP', 1],
    ['g1', 'CRI ENC SOS INT DSC PIS SOS ATQ REV CAP', 1],
  ])('%s, %s: %i trees', (grammarName, input, count) => {
    expect(treesOf(grammarName, input)).toHaveLength(count);
  });
});

describe('every tree', () => {
  it.each([
    ['g0', 'CRI SOS PIS INT REV'],
    ['g1', 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP'],
    ['arithmetic-ambiguous', 'id + id * id'],
    ['parentheses', '( ( ) ) ( )'],
  ])('%s, %s: its leaves, left to right, are the input', (grammarName, input) => {
    for (const tree of treesOf(grammarName, input)) {
      expect(leaves(tree)).toEqual(tokenizeSequence(input));
    }
  });

  it('has the start symbol at the root', () => {
    const [tree] = treesOf('g1', 'CRI PIS REV');
    expect(tree?.kind === 'nonterminal' && tree.symbol).toBe('Relato');
  });

  it('G1 CRI PIS REV: the parts that are missing are ε-subtrees', () => {
    const [tree] = treesOf('g1', 'CRI PIS REV');
    const text = tree === undefined ? '' : renderTree(tree);
    expect(text).toContain('HallazgoOpc\n│  │     └─ ε');
    expect(text.split('\n')[0]).toBe('Relato');
  });
});

describe('the drawing of a small tree', () => {
  it('G0 CRI PIS REV is drawn exactly', () => {
    const [tree] = treesOf('g0', 'CRI PIS REV');
    expect(tree && renderTree(tree)).toBe(
      [
        'Relato',
        '├─ Planteo',
        '│  └─ Hecho',
        '│     └─ CRI',
        '├─ Investigacion',
        '│  └─ Pasos',
        '│     └─ Paso',
        '│        └─ PIS',
        '└─ Desenlace',
        '   └─ Resolucion',
        '      └─ REV',
      ].join('\n'),
    );
  });
});

describe('enumeration', () => {
  it('is lazy: the first trees of L1 come at once, although it has C(197)', () => {
    const grammar = loadBuiltInGrammar('g0');
    const recognition = recognize(grammar, readL1());
    const generator = enumerateTrees(grammar, recognition);
    expect(generator.next().done).toBe(false);
    expect(parseTrees(grammar, recognition, 3)).toHaveLength(3);
  });

  it('a rejected input has no trees', () => {
    expect(treesOf('g1', 'CRI REV')).toEqual([]);
  });

  it('with a cycle, it lists the trees without a repeated item and ends', () => {
    expect(treesOf('test-cyclic', 'a').map(renderTree)).toEqual([
      'S\n└─ a',
      'S\n└─ A\n   └─ S\n      └─ a',
    ]);
  });

  it('the empty input of parentheses has one tree: S → ε', () => {
    expect(treesOf('parentheses', '').map(renderTree)).toEqual(['S\n└─ ε']);
  });
});
