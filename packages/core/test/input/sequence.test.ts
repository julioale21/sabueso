// The story as a string w ∈ Σ*: splitting it into tokens and checking that they are in Σ.
import { describe, expect, it } from 'vitest';
import { checkAlphabet, tokenizeSequence } from '../../src/input/sequence.js';
import { loadBuiltInGrammar, readL1 } from '../helpers/load.js';

describe('tokenizeSequence', () => {
  it('splits a story by spaces: one tag per token', () => {
    expect(tokenizeSequence('CRI PIS REV')).toEqual(['CRI', 'PIS', 'REV']);
  });

  it('accepts any run of spaces, tabs and line breaks as a separator', () => {
    expect(tokenizeSequence('  CRI\t\tPIS \n REV\n')).toEqual(['CRI', 'PIS', 'REV']);
  });

  it('gives no tokens for an empty or blank story: the empty string ε', () => {
    expect(tokenizeSequence('')).toEqual([]);
    expect(tokenizeSequence(' \n\t ')).toEqual([]);
  });

  it('keeps every word as it is, even if it is not a tag: checking Σ is a separate step', () => {
    expect(tokenizeSequence('cri XYZ +')).toEqual(['cri', 'XYZ', '+']);
  });
});

describe('checkAlphabet', () => {
  const g1 = loadBuiltInGrammar('g1');

  it('I6: XYZ is not in Σ, so the error is unknown-symbol at position 1', () => {
    expect(checkAlphabet(['CRI', 'XYZ', 'REV'], g1)).toEqual({
      kind: 'unknown-symbol',
      position: 1,
      found: 'XYZ',
      expected: [],
    });
  });

  it('I6 gives the same error with G0, which has the same Σ', () => {
    expect(checkAlphabet(['CRI', 'XYZ', 'REV'], loadBuiltInGrammar('g0'))?.position).toBe(1);
  });

  it('reports only the first unknown symbol', () => {
    expect(checkAlphabet(['ABC', 'CRI', 'XYZ'], g1)).toMatchObject({ position: 0, found: 'ABC' });
  });

  it('is case sensitive: cri is not the tag CRI', () => {
    expect(checkAlphabet(['cri'], g1)).toMatchObject({ position: 0, found: 'cri' });
  });

  it('a nonterminal is not in Σ either: a story is made only of terminals', () => {
    expect(checkAlphabet(['CRI', 'Pasos', 'REV'], g1)).toMatchObject({ found: 'Pasos' });
  });

  it.each([
    ['V1', 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP'],
    ['I1', 'CTX PER PIS REV'],
    ['I5', 'CRI DSC REV'],
  ])('%s is over Σ: no error, even when the grammar will reject it later', (_id, story) => {
    expect(checkAlphabet(tokenizeSequence(story), g1)).toBeNull();
  });

  it('the empty story is over Σ (ε ∈ Σ*): rejecting it is Earley’s job (case I2)', () => {
    expect(checkAlphabet([], g1)).toBeNull();
  });

  it('L1, with 200 events, is over Σ', () => {
    expect(checkAlphabet(readL1(), g1)).toBeNull();
  });

  it('works with any grammar: id and + are in Σ of arithmetic, CRI is not', () => {
    const arithmetic = loadBuiltInGrammar('arithmetic');
    expect(checkAlphabet(tokenizeSequence('id + id * id'), arithmetic)).toBeNull();
    expect(checkAlphabet(['id', 'CRI'], arithmetic)).toMatchObject({ position: 1 });
  });
});
