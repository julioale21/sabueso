// Runs buildGrammar on every grammar of test/fixtures/grammar-build-cases.ts and compares
// the whole 4-tuple, or the exact error, with the expected values.
import { describe, expect, it } from 'vitest';
import { formatGrammar } from '../src/command-line/format.js';
import { buildGrammar, formatProduction, GrammarBuildError } from '../src/grammar/build.js';
import type { Grammar } from '../src/grammar/types.js';
import {
  errorCases,
  validCases,
  type ErrorCase,
  type ExpectedGrammar,
  type ValidCase,
} from './fixtures/grammar-build-cases.js';

function buildCase(testCase: ValidCase | ErrorCase): Grammar {
  return buildGrammar({
    name: testCase.name,
    rules: testCase.rules,
    start: testCase.start,
    declaredTerminals: testCase.declaredTerminals,
  });
}

/** The grammar as plain values, in the shape of ExpectedGrammar. */
function describeGrammar(grammar: Grammar): ExpectedGrammar {
  const productionsByLeftSide: Record<string, number[]> = {};
  for (const [leftSide, productions] of grammar.productionsByLeftSide) {
    productionsByLeftSide[leftSide] = productions.map((production) => production.id);
  }
  return {
    start: grammar.start,
    nonterminals: [...grammar.nonterminals],
    terminals: [...grammar.terminals],
    productions: grammar.productions.map(formatProduction),
    productionsByLeftSide,
  };
}

/** Runs the build and returns the error it throws, failing if it does not throw. */
function captureBuildError(testCase: ErrorCase): unknown {
  try {
    buildCase(testCase);
  } catch (error) {
    return error;
  }
  throw new Error(`Expected "${testCase.name}" to be rejected`);
}

describe('buildGrammar: valid grammars', () => {
  it.each(validCases)('$name: $purpose', (testCase) => {
    expect(describeGrammar(buildCase(testCase))).toEqual(testCase.expected);
  });

  it.each(validCases)('$name: every production id is its position in P', (testCase) => {
    const grammar = buildCase(testCase);
    grammar.productions.forEach((production, position) => {
      expect(production.id).toBe(position);
    });
  });

  it.each(validCases)('$name: N and Σ are disjoint', (testCase) => {
    const grammar = buildCase(testCase);
    const shared = [...grammar.terminals].filter((symbol) => grammar.nonterminals.has(symbol));
    expect(shared).toEqual([]);
  });

  it.each(validCases)('$name: every right-hand-side symbol is in N or Σ', (testCase) => {
    const grammar = buildCase(testCase);
    const symbols = grammar.productions.flatMap((production) => production.rightSide);
    const unknown = symbols.filter(
      (symbol) => !grammar.nonterminals.has(symbol) && !grammar.terminals.has(symbol),
    );
    expect(unknown).toEqual([]);
  });

  it("literal-with-space: keeps 'b c' as one symbol and b c as two", () => {
    const literalWithSpace = validCases.find((testCase) => testCase.name === 'literal-with-space');
    expect(literalWithSpace).toBeDefined();
    const grammar = buildCase(literalWithSpace!);
    expect(grammar.productions.map((production) => production.rightSide)).toEqual([
      ['b c'],
      ['b', 'c'],
    ]);
  });
});

describe('buildGrammar: rejected grammars', () => {
  it.each(errorCases)('$name: $purpose', (testCase) => {
    const error = captureBuildError(testCase);
    expect(error).toBeInstanceOf(GrammarBuildError);
    expect((error as GrammarBuildError).message).toBe(testCase.message);
  });
});

describe('formatGrammar', () => {
  it('writes ε for an empty right side and sorts N and Σ', () => {
    const parentheses = validCases.find((testCase) => testCase.name === 'parentheses');
    expect(parentheses).toBeDefined();
    expect(formatGrammar(buildCase(parentheses!))).toBe(
      [
        'parentheses: G = (N, Σ, P, S)',
        'N = {S}',
        'Σ = {(, )}',
        'S = S',
        'P:',
        '   0  S → ( S ) S',
        '   1  S → ε',
      ].join('\n'),
    );
  });

  it('aligns production ids of two digits', () => {
    const digits = Array.from({ length: 11 }, (_, digit) => ({
      leftSide: 'D',
      rightSide: [{ literal: `d${digit}` }],
    }));
    const lines = formatGrammar(buildGrammar({ name: 'digits', rules: digits })).split('\n');
    expect(lines.at(-2)).toBe('   9  D → d9');
    expect(lines.at(-1)).toBe('  10  D → d10');
  });
});
