// analyzeGrammar: every analysis of steps 7 to 12 in one result.
import { describe, expect, it } from 'vitest';
import { analyzeGrammar } from '../../src/analysis/index.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

describe('analyzeGrammar', () => {
  it('G1: 10 nullable, minYield 3, no useless symbols, no cycles, LL(1)', () => {
    const analysis = analyzeGrammar(loadBuiltInGrammar('g1'));
    expect(analysis.nullable.size).toBe(10);
    expect(analysis.minYield.get('Relato')).toBe(3);
    expect(analysis.useless.size).toBe(0);
    expect(analysis.isEmpty).toBe(false);
    expect(analysis.cycles).toEqual([]);
    expect(analysis.follow.get('Pasos')).toEqual(new Set(['REV']));
    expect(analysis.predictiveTable.isPredictive).toBe(true);
  });

  it('test-useless, test-empty and test-cyclic show their property', () => {
    expect(analyzeGrammar(loadBuiltInGrammar('test-useless')).useless).toEqual(new Set(['A', 'C']));
    expect(analyzeGrammar(loadBuiltInGrammar('test-empty')).isEmpty).toBe(true);
    expect(analyzeGrammar(loadBuiltInGrammar('test-cyclic')).cycles).toEqual([['S', 'A']]);
  });
});
