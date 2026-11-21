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
    expect(checkAlphabet({ tokens: ['CRI', 'XYZ', 'REV'], grammar: g1 })).toEqual({
      kind: 'unknown-symbol',
      position: 1,
      found: 'XYZ',
      expected: [],
    });
  });

  it('I6 gives the same error with G0, which has the same Σ', () => {
    expect(
      checkAlphabet({ tokens: ['CRI', 'XYZ', 'REV'], grammar: loadBuiltInGrammar('g0') })?.position,
    ).toBe(1);
  });

  it('reports only the first unknown symbol', () => {
    expect(checkAlphabet({ tokens: ['ABC', 'CRI', 'XYZ'], grammar: g1 })).toMatchObject({
      position: 0,
      found: 'ABC',
    });
  });

  it('is case sensitive: cri is not the tag CRI', () => {
    expect(checkAlphabet({ tokens: ['cri'], grammar: g1 })).toMatchObject({
      position: 0,
      found: 'cri',
    });
  });

  it('a nonterminal is not in Σ either: a story is made only of terminals', () => {
    expect(checkAlphabet({ tokens: ['CRI', 'Pasos', 'REV'], grammar: g1 })).toMatchObject({
      found: 'Pasos',
    });
  });

  it.each([
    ['V1', 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP'],
    ['I1', 'CTX PER PIS REV'],
    ['I5', 'CRI DSC REV'],
  ])('%s is over Σ: no error, even when the grammar will reject it later', (_id, story) => {
    expect(checkAlphabet({ tokens: tokenizeSequence(story), grammar: g1 })).toBeNull();
  });

  it('the empty story is over Σ (ε ∈ Σ*): rejecting it is Earley’s job (case I2)', () => {
    expect(checkAlphabet({ tokens: [], grammar: g1 })).toBeNull();
  });

  it('L1, with 200 events, is over Σ', () => {
    expect(checkAlphabet({ tokens: readL1(), grammar: g1 })).toBeNull();
  });

  it('works with any grammar: id and + are in Σ of arithmetic, CRI is not', () => {
    const arithmetic = loadBuiltInGrammar('arithmetic');
    expect(
      checkAlphabet({ tokens: tokenizeSequence('id + id * id'), grammar: arithmetic }),
    ).toBeNull();
    expect(checkAlphabet({ tokens: ['id', 'CRI'], grammar: arithmetic })).toMatchObject({
      position: 1,
    });
  });
});
