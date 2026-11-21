// FIRST and FOLLOW by least fixed point (step 11, Aho et al. 4.4.2).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  computeFirst,
  computeFirstFollow,
  computeFollow,
  firstOfSequence,
} from '../../src/analysis/first-follow.js';
import { computeNullable } from '../../src/analysis/nullable.js';
import { parseGrammarText } from '../../src/grammar-format/parser.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

const miniDetective = parseGrammarText({
  text: readFileSync(
    new URL('../../../../examples/grammars/mini-detective.grammar', import.meta.url),
    'utf8',
  ),
  name: 'mini-detective',
});

function sorted({
  sets,
  symbol,
}: {
  sets: ReadonlyMap<string, ReadonlySet<string>>;
  symbol: string;
}): string[] {
  return [...(sets.get(symbol) ?? [])].sort();
}

describe('FIRST and FOLLOW of the mini detective story (the hand-made tables)', () => {
  const { first, follow } = computeFirstFollow({ grammar: miniDetective });

  it.each([
    ['Relato', ['CRI', 'HAL']],
    ['Inicio', ['CRI', 'HAL']],
    ['Hallazgo', ['HAL', 'ε']],
    ['Pistas', ['INT', 'PIS']],
    ['MasPistas', ['INT', 'PIS', 'ε']],
    ['Pista', ['INT', 'PIS']],
    ['Final', ['REV']],
    ['Epilogo', ['EPI', 'ε']],
  ])('FIRST(%s) = %j', (symbol, expected) => {
    expect(sorted({ sets: first, symbol })).toEqual(expected);
  });

  it.each([
    ['Relato', ['$']],
    ['Inicio', ['INT', 'PIS']],
    ['Hallazgo', ['INT', 'PIS']],
    ['Pistas', ['REV']],
    ['MasPistas', ['REV']],
    ['Pista', ['INT', 'PIS', 'REV']],
    ['Final', ['$']],
    ['Epilogo', ['$']],
  ])('FOLLOW(%s) = %j', (symbol, expected) => {
    expect(sorted({ sets: follow, symbol })).toEqual(expected);
  });
});

describe('G1: the sets of section 4.4 of the spec', () => {
  const { first, follow } = computeFirstFollow({ grammar: loadBuiltInGrammar('g1') });

  it.each([
    ['Pasos', ['REV']],
    ['Lineas', ['REV']],
    ['Linea', ['REV', 'SOS']],
    ['CuerpoLinea', ['REV', 'SOS']],
    ['Descarte', ['REV', 'SOS']],
    ['Libres', ['REV', 'SOS']],
    ['MarcoOpc', ['ATQ', 'ENC', 'INT', 'PIS', 'SOS']],
    ['HallazgoOpc', ['ATQ', 'CTX', 'ENC', 'INT', 'PER', 'PIS', 'SOS']],
    ['Cierre', ['$', 'EPI']],
    ['CapOpc', ['$', 'EPI']],
    ['Relato', ['$']],
  ])('FOLLOW(%s) = %j', (symbol, expected) => {
    expect(sorted({ sets: follow, symbol })).toEqual(expected);
  });

  it.each([
    ['Desenlace', ['REV']],
    ['Evidencia', ['ATQ', 'INT', 'PIS']],
    ['Investigacion', ['ATQ', 'ENC', 'INT', 'PIS', 'SOS']],
    ['Relato', ['CRI', 'CTX', 'HAL', 'PER']],
    ['CuerpoLinea', ['ATQ', 'DSC', 'INT', 'PIS', 'ε']],
  ])('FIRST(%s) = %j', (symbol, expected) => {
    expect(sorted({ sets: first, symbol })).toEqual(expected);
  });

  it('FOLLOW(Libres) = {SOS, REV} is disjoint from FIRST(Evidencia) = {PIS, INT, ATQ}', () => {
    const overlap = [...(follow.get('Libres') ?? [])].filter((member) =>
      first.get('Evidencia')?.has(member),
    );
    expect(overlap).toEqual([]);
  });
});

describe('G0', () => {
  it('FOLLOW(Pasos) also has what a Pasos can start with, because of Pasos → Pasos Pasos', () => {
    const { follow } = computeFirstFollow({ grammar: loadBuiltInGrammar('g0') });
    expect(sorted({ sets: follow, symbol: 'Pasos' })).toEqual([
      'ATQ',
      'DSC',
      'INT',
      'PIS',
      'REV',
      'SOS',
    ]);
  });
});

describe('ε in FIRST', () => {
  it.each(['g0', 'g1', 'parentheses', 'epsilon-trap', 'arithmetic'])(
    '%s: ε ∈ FIRST(A) exactly for the nullable symbols of step 7',
    (name) => {
      const grammar = loadBuiltInGrammar(name);
      const first = computeFirst({ grammar });
      const withEmpty = [...grammar.nonterminals].filter((symbol) => first.get(symbol)?.has('ε'));
      expect(new Set(withEmpty)).toEqual(computeNullable({ grammar }));
    },
  );
});

describe('firstOfSequence', () => {
  const first = computeFirst({ grammar: miniDetective });

  it('a terminal is its own FIRST', () => {
    expect([...firstOfSequence({ symbols: ['REV'], first })]).toEqual(['REV']);
  });

  it('skips a symbol that can vanish and looks at the next one', () => {
    expect([...firstOfSequence({ symbols: ['Hallazgo', 'Pistas'], first })].sort()).toEqual([
      'HAL',
      'INT',
      'PIS',
    ]);
  });

  it('has ε only if every symbol can vanish; the empty sequence is just ε', () => {
    expect([...firstOfSequence({ symbols: ['Hallazgo', 'Epilogo'], first })].sort()).toEqual([
      'EPI',
      'HAL',
      'ε',
    ]);
    expect([...firstOfSequence({ symbols: [], first })]).toEqual(['ε']);
  });
});

describe('the rounds of the fixed points', () => {
  it('mini detective: FIRST takes 2 rounds plus the check, then FOLLOW', () => {
    const phases: string[] = [];
    computeFirstFollow({
      grammar: miniDetective,
      onRound: ({ phase, round }) => phases.push(`${phase} ${round}`),
    });
    expect(phases.slice(0, 3)).toEqual(['first 1', 'first 2', 'first 3']);
    expect(phases.filter((step) => step.startsWith('follow')).length).toBeGreaterThan(1);
  });

  it('computeFollow starts with $ in FOLLOW(S)', () => {
    const grammar = parseGrammarText({ text: "S -> 'a'\n", name: 'one' });
    expect(
      sorted({
        sets: computeFollow({ grammar, first: computeFirst({ grammar }) }),
        symbol: 'S',
      }),
    ).toEqual(['$']);
  });

  it('left recursion is no problem: arithmetic FIRST(E) = {(, id}', () => {
    expect(
      sorted({ sets: computeFirst({ grammar: loadBuiltInGrammar('arithmetic') }), symbol: 'E' }),
    ).toEqual(['(', 'id']);
  });
});
