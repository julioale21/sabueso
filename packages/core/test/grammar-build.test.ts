import { describe, expect, it } from 'vitest';
import { buildGrammar, formatProduction, GrammarBuildError } from '../src/grammar/build.js';

const expressionRules = [
  { leftSide: 'E', rightSide: ['E', '+', 'T'] },
  { leftSide: 'E', rightSide: ['T'] },
  { leftSide: 'T', rightSide: ['id'] },
];

describe('buildGrammar', () => {
  it('classifies left-hand sides as N and every other symbol as Σ', () => {
    const grammar = buildGrammar('expressions', expressionRules);
    expect([...grammar.nonterminals]).toEqual(['E', 'T']);
    expect([...grammar.terminals]).toEqual(['+', 'id']);
  });

  it('numbers the productions from 0, in order', () => {
    const grammar = buildGrammar('expressions', expressionRules);
    expect(grammar.productions.map(formatProduction)).toEqual(['E → E + T', 'E → T', 'T → id']);
    expect(grammar.productions.map((production) => production.id)).toEqual([0, 1, 2]);
  });

  it('indexes the productions of each nonterminal', () => {
    const grammar = buildGrammar('expressions', expressionRules);
    expect(grammar.productionsByLeftSide.get('E')?.map((production) => production.id)).toEqual([
      0, 1,
    ]);
    expect(grammar.productionsByLeftSide.get('T')?.map((production) => production.id)).toEqual([2]);
  });

  it('uses the left-hand side of the first rule as the default start symbol', () => {
    expect(buildGrammar('expressions', expressionRules).start).toBe('E');
    expect(buildGrammar('expressions', expressionRules, 'T').start).toBe('T');
  });

  it('represents an ε-production with an empty right side', () => {
    const grammar = buildGrammar('parentheses', [
      { leftSide: 'S', rightSide: [{ literal: '(' }, 'S', { literal: ')' }, 'S'] },
      { leftSide: 'S', rightSide: [] },
    ]);
    expect(grammar.productions.map(formatProduction)).toEqual(['S → ( S ) S', 'S → ε']);
    expect([...grammar.terminals]).toEqual(['(', ')']);
  });

  it('names a literal by its content, so it matches the space-separated input', () => {
    const grammar = buildGrammar('sum', [
      { leftSide: 'E', rightSide: ['E', { literal: '+' }, 'E'] },
    ]);
    expect(grammar.productions[0]?.rightSide).toEqual(['E', '+', 'E']);
  });

  it('adds declared terminals to Σ even if no rule uses them', () => {
    const grammar = buildGrammar(
      'story',
      [{ leftSide: 'Relato', rightSide: ['CRI', 'REV'] }],
      undefined,
      ['CRI', 'REV', 'EPI'],
    );
    expect([...grammar.terminals].sort()).toEqual(['CRI', 'EPI', 'REV']);
  });
});

describe('buildGrammar errors', () => {
  function expectBuildError(build: () => unknown, message: RegExp): void {
    expect(build).toThrow(GrammarBuildError);
    expect(build).toThrow(message);
  }

  it('rejects a grammar without rules', () => {
    expectBuildError(() => buildGrammar('nothing', []), /has no rules/);
  });

  it('rejects a start symbol that is not a nonterminal', () => {
    expectBuildError(() => buildGrammar('expressions', expressionRules, 'X'), /Start symbol "X"/);
  });

  it('names an undeclared identifier when %terminals is present', () => {
    const rules = [{ leftSide: 'Relato', rightSide: ['CRI', 'Pistas'] }];
    expectBuildError(
      () => buildGrammar('story', rules, undefined, ['CRI']),
      /Undeclared symbol "Pistas"/,
    );
  });

  it('rejects a declared terminal that is also a left-hand side', () => {
    const rules = [{ leftSide: 'Relato', rightSide: ['CRI'] }];
    expectBuildError(
      () => buildGrammar('story', rules, undefined, ['CRI', 'Relato']),
      /"Relato" is declared as a terminal/,
    );
  });

  it('rejects duplicate productions', () => {
    const rules = [...expressionRules, { leftSide: 'T', rightSide: ['id'] }];
    expectBuildError(() => buildGrammar('expressions', rules), /Duplicate production: T → id/);
  });

  it('rejects a literal with the name of a nonterminal', () => {
    const rules = [{ leftSide: 'E', rightSide: [{ literal: 'E' }] }];
    expectBuildError(() => buildGrammar('clash', rules), /Literal 'E'/);
  });

  it("rejects '$', reserved for FOLLOW and $S", () => {
    expectBuildError(
      () => buildGrammar('dollar', [{ leftSide: 'S', rightSide: [{ literal: '$' }] }]),
      /reserved/,
    );
    expectBuildError(
      () => buildGrammar('dollar', [{ leftSide: '$S', rightSide: ['a'] }]),
      /reserved/,
    );
  });

  it('rejects an empty literal', () => {
    expectBuildError(
      () => buildGrammar('empty', [{ leftSide: 'S', rightSide: [{ literal: '' }] }]),
      /ε/,
    );
  });
});
