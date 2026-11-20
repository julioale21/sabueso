// Why an input is rejected: position, found and expected, read from the chart (step 16).
import { describe, expect, it } from 'vitest';
import { diagnose, expectedTerminals, type ParseError } from '../../src/earley/diagnostics.js';
import { recognize } from '../../src/earley/recognizer.js';
import { checkAlphabet, tokenizeSequence } from '../../src/input/sequence.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

/** The error of an input, as the program reports it: the alphabet first, then Earley. */
function errorOf(grammarName: string, input: string): ParseError | null {
  const grammar = loadBuiltInGrammar(grammarName);
  const tokens = tokenizeSequence(input);
  const unknown = checkAlphabet(tokens, grammar);
  if (unknown !== null) {
    return unknown;
  }
  const { chart, accepted } = recognize(grammar, tokens);
  return diagnose(grammar, chart, tokens, accepted);
}

const ALL_STEPS = ['ATQ', 'CTX', 'DSC', 'ENC', 'HAL', 'INT', 'PER', 'PIS', 'SOS'];
const G1_STEPS = ['ATQ', 'CTX', 'ENC', 'HAL', 'INT', 'PER', 'PIS', 'SOS'];

describe('the errors of table 9.1', () => {
  it.each(['g0', 'g1'])(
    '%s, I1 CTX PER PIS REV: position 2, found PIS, expected CRI or HAL',
    (g) => {
      expect(errorOf(g, 'CTX PER PIS REV')).toEqual({
        kind: 'unexpected-token',
        position: 2,
        found: 'PIS',
        expected: ['CRI', 'HAL'],
      });
    },
  );

  it.each(['g0', 'g1'])('%s, I2 (empty): position 0, end of input', (g) => {
    expect(errorOf(g, '')).toEqual({
      kind: 'unexpected-end',
      position: 0,
      found: null,
      expected: ['CRI', 'CTX', 'HAL', 'PER'],
    });
  });

  it.each([
    ['g0', ALL_STEPS],
    ['g1', G1_STEPS],
  ])('%s, I3 CRI REV: position 1, found REV (G1 does not expect DSC)', (g, expected) => {
    expect(errorOf(g, 'CRI REV')).toEqual({
      kind: 'unexpected-token',
      position: 1,
      found: 'REV',
      expected,
    });
  });

  it.each([
    ['g0', ['ATQ', 'DSC', 'INT', 'PIS', 'REV', 'SOS']],
    ['g1', ['ATQ', 'INT', 'PIS', 'REV', 'SOS']],
  ])('%s, I4 CRI PIS: position 2, end of input', (g, expected) => {
    expect(errorOf(g, 'CRI PIS')).toEqual({
      kind: 'unexpected-end',
      position: 2,
      found: null,
      expected,
    });
  });

  it('G1, I5 CRI DSC REV: position 1, found DSC (a discard with no open suspicion)', () => {
    expect(errorOf('g1', 'CRI DSC REV')).toEqual({
      kind: 'unexpected-token',
      position: 1,
      found: 'DSC',
      expected: G1_STEPS,
    });
  });

  it.each(['g0', 'g1'])('%s, I6 CRI XYZ REV: unknown symbol at position 1', (g) => {
    expect(errorOf(g, 'CRI XYZ REV')).toEqual({
      kind: 'unknown-symbol',
      position: 1,
      found: 'XYZ',
      expected: [],
    });
  });

  it('G1, I7 CRI SOS DSC DSC REV: position 3, found the second DSC', () => {
    expect(errorOf('g1', 'CRI SOS DSC DSC REV')).toEqual({
      kind: 'unexpected-token',
      position: 3,
      found: 'DSC',
      expected: ['ATQ', 'INT', 'PIS', 'REV', 'SOS'],
    });
  });

  it('P2 parentheses ( ( ): position 3, end of input, expected ( or )', () => {
    expect(errorOf('parentheses', '( ( )')).toEqual({
      kind: 'unexpected-end',
      position: 3,
      found: null,
      expected: ['(', ')'],
    });
  });
});

describe('diagnose', () => {
  it('an accepted input has no error', () => {
    expect(errorOf('g1', 'CRI PIS REV')).toBeNull();
    expect(errorOf('g0', 'CRI DSC REV')).toBeNull();
  });

  it('when nothing can come next, expected is empty: the input is incomplete', () => {
    expect(errorOf('test-empty', '')).toEqual({
      kind: 'unexpected-end',
      position: 0,
      found: null,
      expected: [],
    });
  });

  it('the error is at the first empty set, even if the input goes on', () => {
    expect(errorOf('g1', 'CTX PER PIS REV CNF CAP EPI')?.position).toBe(2);
  });
});

describe('expectedTerminals', () => {
  it('the terminals after the dot in a set, without repeats and sorted', () => {
    const grammar = loadBuiltInGrammar('g1');
    const { chart } = recognize(grammar, ['CRI']);
    expect(expectedTerminals(grammar, chart[0])).toEqual(['CRI', 'CTX', 'HAL', 'PER']);
  });

  it('a missing set gives no terminals', () => {
    expect(expectedTerminals(loadBuiltInGrammar('g1'), undefined)).toEqual([]);
  });
});
