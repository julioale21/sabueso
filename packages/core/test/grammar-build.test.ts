import { describe, expect, it } from 'vitest';
import { buildGrammar, formatProduction, GrammarBuildError } from '../src/grammar/build.js';

const expressionRules = [
  { lhs: 'E', rhs: ['E', '+', 'T'] },
  { lhs: 'E', rhs: ['T'] },
  { lhs: 'T', rhs: ['id'] },
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
    expect(grammar.byLhs.get('E')?.map((production) => production.id)).toEqual([0, 1]);
    expect(grammar.byLhs.get('T')?.map((production) => production.id)).toEqual([2]);
  });

  it('uses the left-hand side of the first rule as the default start symbol', () => {
    expect(buildGrammar('expressions', expressionRules).start).toBe('E');
    expect(buildGrammar('expressions', expressionRules, 'T').start).toBe('T');
  });

  it('represents an ε-production with an empty rhs', () => {
    const grammar = buildGrammar('parentheses', [
      { lhs: 'S', rhs: [{ literal: '(' }, 'S', { literal: ')' }, 'S'] },
      { lhs: 'S', rhs: [] },
    ]);
    expect(grammar.productions.map(formatProduction)).toEqual(['S → ( S ) S', 'S → ε']);
    expect([...grammar.terminals]).toEqual(['(', ')']);
  });

  it('names a literal by its content, so it matches the space-separated input', () => {
    const grammar = buildGrammar('sum', [{ lhs: 'E', rhs: ['E', { literal: '+' }, 'E'] }]);
    expect(grammar.productions[0]?.rhs).toEqual(['E', '+', 'E']);
  });

  it('adds declared terminals to Σ even if no rule uses them', () => {
    const grammar = buildGrammar('story', [{ lhs: 'Relato', rhs: ['CRI', 'REV'] }], undefined, [
      'CRI',
      'REV',
      'EPI',
    ]);
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
    const rules = [{ lhs: 'Relato', rhs: ['CRI', 'Pistas'] }];
    expectBuildError(
      () => buildGrammar('story', rules, undefined, ['CRI']),
      /Undeclared symbol "Pistas"/,
    );
  });

  it('rejects a declared terminal that is also a left-hand side', () => {
    const rules = [{ lhs: 'Relato', rhs: ['CRI'] }];
    expectBuildError(
      () => buildGrammar('story', rules, undefined, ['CRI', 'Relato']),
      /"Relato" is declared as a terminal/,
    );
  });

  it('rejects duplicate productions', () => {
    const rules = [...expressionRules, { lhs: 'T', rhs: ['id'] }];
    expectBuildError(() => buildGrammar('expressions', rules), /Duplicate production: T → id/);
  });

  it('rejects a literal with the name of a nonterminal', () => {
    const rules = [{ lhs: 'E', rhs: [{ literal: 'E' }] }];
    expectBuildError(() => buildGrammar('clash', rules), /Literal 'E'/);
  });

  it("rejects '$', reserved for FOLLOW and $S", () => {
    expectBuildError(
      () => buildGrammar('dollar', [{ lhs: 'S', rhs: [{ literal: '$' }] }]),
      /reserved/,
    );
    expectBuildError(() => buildGrammar('dollar', [{ lhs: '$S', rhs: ['a'] }]), /reserved/);
  });

  it('rejects an empty literal', () => {
    expectBuildError(() => buildGrammar('empty', [{ lhs: 'S', rhs: [{ literal: '' }] }]), /ε/);
  });
});
