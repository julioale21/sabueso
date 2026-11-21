// CYK on grammars in Chomsky normal form: the table, the verdict and the tree (step 25).
import { describe, expect, it } from 'vitest';
import { toChomskyNormalForm } from '../../src/chomsky-normal-form/index.js';
import { recognizeCockeYoungerKasami } from '../../src/cocke-younger-kasami/recognizer.js';
import type { Grammar, SymbolName } from '../../src/grammar/types.js';
import { renderTree } from '../../src/trees/render.js';
import type { ParseTree } from '../../src/trees/tree.js';
import { accepts, stringsUpTo } from '../helpers/language.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

const normalForm = (name: string): Grammar => toChomskyNormalForm(loadBuiltInGrammar(name)).grammar;

const cyk = ({ grammar, input }: { grammar: Grammar; input: string }) =>
  recognizeCockeYoungerKasami({ grammar, tokens: input.split(' ').filter(Boolean) });

/** The table as text: one row per start position, '{A,B}' per length from 1. */
const tableRows = (table: Set<SymbolName>[][]): string[][] =>
  table.map((row) => row.slice(1).map((cell) => [...cell].sort().join(',')));

/** The symbols of the inner nodes of a tree, in preorder. */
function innerSymbols(tree: ParseTree): SymbolName[] {
  return tree.kind === 'nonterminal'
    ? [tree.symbol, ...tree.children.flatMap((child) => innerSymbols(child))]
    : [];
}

/** The leaves of a tree, left to right: the input it derives. */
function leaves(tree: ParseTree): SymbolName[] {
  if (tree.kind === 'terminal') {
    return [tree.symbol];
  }
  return tree.kind === 'nonterminal' ? tree.children.flatMap((child) => leaves(child)) : [];
}

describe('the CYK table', () => {
  it('( ) ( ) with parentheses (computed by hand): S0 ∈ T[0][4]', () => {
    const result = cyk({ grammar: normalForm('parentheses'), input: '( ) ( )' });
    expect(result.accepted).toBe(true);
    // Row i = start position; column l − 1 = length l.
    expect(tableRows(result.table)).toEqual([
      ['T_(', 'S,S0', '', 'S,S0'],
      ['T_)', '', 'X2,X4,X6,X8'],
      ['T_(', 'S,S0'],
      ['T_)'],
    ]);
  });

  it('( ( ) is rejected: S0 ∉ T[0][3]', () => {
    const result = cyk({ grammar: normalForm('parentheses'), input: '( ( )' });
    expect(result.accepted).toBe(false);
    expect(result.table[0]?.[3]).toEqual(new Set());
    expect(result.tree).toBeNull();
  });

  it('CRI PIS REV with G1: the length-1 cells hold every A → a of each tag', () => {
    const result = cyk({ grammar: normalForm('g1'), input: 'CRI PIS REV' });
    expect(result.table[0]?.[1]).toEqual(new Set(['Planteo', 'Hecho', 'T_CRI']));
    expect(result.table[1]?.[2]).toEqual(new Set(['X1']));
    expect(result.table[0]?.[3]).toEqual(new Set(['Relato']));
  });

  it('the empty input is accepted only with S → ε', () => {
    const parentheses = cyk({ grammar: normalForm('parentheses'), input: '' });
    expect(parentheses.accepted).toBe(true);
    expect(parentheses.table).toEqual([]);
    expect(parentheses.tree && renderTree(parentheses.tree)).toBe('S0\n└─ ε');
    expect(cyk({ grammar: normalForm('g1'), input: '' }).accepted).toBe(false);
  });

  it('refuses a grammar that is not in Chomsky normal form', () => {
    expect(() => cyk({ grammar: loadBuiltInGrammar('parentheses'), input: '( )' })).toThrow(
      /Chomsky normal form/,
    );
  });
});

describe('the tree in Chomsky normal form', () => {
  it('( ) ( ) with parentheses (computed by hand)', () => {
    const { tree } = cyk({ grammar: normalForm('parentheses'), input: '( ) ( )' });
    expect(tree && renderTree(tree)).toBe(
      [
        'S0',
        '├─ T_(',
        '│  └─ (',
        '└─ X4',
        '   ├─ T_)',
        '   │  └─ )',
        '   └─ S',
        '      ├─ T_(',
        '      │  └─ (',
        '      └─ T_)',
        '         └─ )',
      ].join('\n'),
    );
  });

  it('CRI PIS REV with G0 has an X node and loses the unit and ε nodes of the grammar', () => {
    const { tree } = cyk({ grammar: normalForm('g0'), input: 'CRI PIS REV' });
    expect(tree).not.toBeNull();
    const symbols = innerSymbols(tree as ParseTree);
    expect(symbols).toEqual(['Relato', 'Planteo', 'X1', 'Investigacion', 'Desenlace']);
    expect(symbols.some((symbol) => symbol.startsWith('X') || symbol.startsWith('T_'))).toBe(true);
    expect(symbols).not.toContain('Hecho');
    expect(leaves(tree as ParseTree)).toEqual(['CRI', 'PIS', 'REV']);
  });

  it.each([
    ['g1', 'CRI SOS PIS INT REV'],
    ['g0', 'CRI SOS PIS INT REV'],
    ['arithmetic', 'id + id * id'],
    ['arithmetic-ambiguous', '( id + id ) * id'],
  ])('%s: the leaves of the tree of "%s" are the input', (name, input) => {
    const { tree } = cyk({ grammar: normalForm(name), input });
    expect(tree && leaves(tree)).toEqual(input.split(' '));
  });
});

describe('CYK on FNC(G) and Earley on G accept the same strings', () => {
  it.each([
    ['parentheses', ['(', ')'], 6],
    ['arithmetic', ['id', '+', '*', '(', ')'], 4],
    ['epsilon-trap', ['x'], 3],
    ['test-empty', ['a'], 3],
    ['test-cyclic', ['a'], 3],
  ])('%s, every string up to length %#', (name, alphabet, maxLength) => {
    const grammar = loadBuiltInGrammar(name);
    const converted = normalForm(name);
    const differences = stringsUpTo({ alphabet, maxLength }).filter(
      (tokens) =>
        recognizeCockeYoungerKasami({ grammar: converted, tokens }).accepted !==
        accepts({ grammar, tokens }),
    );
    expect(differences).toEqual([]);
  });

  it('G0 and G1, every string up to length 3', () => {
    for (const name of ['g0', 'g1']) {
      const grammar = loadBuiltInGrammar(name);
      const converted = normalForm(name);
      const differences = stringsUpTo({ alphabet: [...grammar.terminals], maxLength: 3 }).filter(
        (tokens) =>
          recognizeCockeYoungerKasami({ grammar: converted, tokens }).accepted !==
          accepts({ grammar, tokens }),
      );
      expect(differences).toEqual([]);
    }
  });
});
