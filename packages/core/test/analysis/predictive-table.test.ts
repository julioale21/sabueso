// The LL(1) table M[A, a] and its conflicts (step 12, Aho et al. 4.4.3).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeFirstFollow } from '../../src/analysis/first-follow.js';
import { buildPredictiveTable, predictionSet } from '../../src/analysis/predictive-table.js';
import { formatProduction } from '../../src/grammar/build.js';
import { parseGrammarText } from '../../src/grammar-format/parser.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

const miniDetective = parseGrammarText({
  text: readFileSync(
    new URL('../../../../examples/grammars/mini-detective.grammar', import.meta.url),
    'utf8',
  ),
  name: 'mini-detective',
});

function conflictCells(name: string): string[] {
  return buildPredictiveTable({ grammar: loadBuiltInGrammar(name) }).conflicts.map(
    (conflict) => `${conflict.nonterminal}, ${conflict.lookahead}`,
  );
}

describe('buildPredictiveTable', () => {
  it.each(['g1', 'meta'])('%s has 0 conflicts: it is LL(1), so unambiguous', (name) => {
    const predictive = buildPredictiveTable({ grammar: loadBuiltInGrammar(name) });
    expect(predictive.conflicts).toEqual([]);
    expect(predictive.isPredictive).toBe(true);
  });

  it('G0 is not LL(1): among its conflicts, (Linea, SOS), (Planteo, CRI) and (Pasos, PIS)', () => {
    const cells = conflictCells('g0');
    expect(cells).toEqual(expect.arrayContaining(['Linea, SOS', 'Planteo, CRI', 'Pasos, PIS']));
    expect(buildPredictiveTable({ grammar: loadBuiltInGrammar('g0') }).isPredictive).toBe(false);
  });

  it('G0: the cell (Pasos, PIS) holds Pasos → Paso and Pasos → Pasos Pasos', () => {
    const conflict = buildPredictiveTable({ grammar: loadBuiltInGrammar('g0') }).conflicts.find(
      (candidate) => candidate.nonterminal === 'Pasos' && candidate.lookahead === 'PIS',
    );
    expect(conflict?.productions.map(formatProduction)).toEqual([
      'Pasos → Paso',
      'Pasos → Pasos Pasos',
    ]);
  });

  it('arithmetic is not LL(1) because of left recursion: E → E + T and E → T both start with id', () => {
    expect(conflictCells('arithmetic')).toEqual(['E, (', 'E, id', 'T, (', 'T, id']);
  });

  it('the mini detective story has exactly the table of the guide', () => {
    const { table, isPredictive } = buildPredictiveTable({ grammar: miniDetective });
    const cell = ({ nonterminal, lookahead }: { nonterminal: string; lookahead: string }) =>
      table.get(nonterminal)?.get(lookahead)?.map(formatProduction);
    expect(isPredictive).toBe(true);
    expect(cell({ nonterminal: 'Inicio', lookahead: 'CRI' })).toEqual(['Inicio → CRI Hallazgo']);
    expect(cell({ nonterminal: 'Hallazgo', lookahead: 'PIS' })).toEqual(['Hallazgo → ε']);
    expect(cell({ nonterminal: 'MasPistas', lookahead: 'REV' })).toEqual(['MasPistas → ε']);
    expect(cell({ nonterminal: 'Epilogo', lookahead: '$' })).toEqual(['Epilogo → ε']);
    expect(cell({ nonterminal: 'Hallazgo', lookahead: 'REV' })).toBeUndefined();
  });

  it('a factorable grammar has a conflict: Inicio → CRI HAL | CRI', () => {
    const grammar = parseGrammarText({
      text: "Inicio -> 'CRI' 'HAL' | 'CRI' | 'HAL'\n",
      name: 'unfactored',
    });
    expect(
      buildPredictiveTable({ grammar }).conflicts.map((conflict) => conflict.lookahead),
    ).toEqual(['CRI']);
  });

  it('an ε-production goes in the columns of FOLLOW, $ included', () => {
    const { table } = buildPredictiveTable({ grammar: loadBuiltInGrammar('parentheses') });
    expect([...(table.get('S')?.keys() ?? [])].sort()).toEqual(['$', '(', ')']);
  });
});

describe('predictionSet', () => {
  const sets = computeFirstFollow(miniDetective);
  const production = (text: string) =>
    miniDetective.productions.find((candidate) => formatProduction(candidate) === text);

  it('FIRST of the right side when it cannot derive ε', () => {
    const inicio = production('Inicio → CRI Hallazgo');
    expect(inicio && [...predictionSet({ production: inicio, sets })]).toEqual(['CRI']);
  });

  it('FOLLOW of the left side for an ε-production', () => {
    const empty = production('Hallazgo → ε');
    expect(empty && [...predictionSet({ production: empty, sets })].sort()).toEqual(['INT', 'PIS']);
  });
});
