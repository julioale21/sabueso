// Runs the .grammar lexer on every case of test/fixtures/lexer-cases.ts, and checks that
// its δ table matches the guide.
import { describe, expect, it } from 'vitest';
import {
  classifyCharacter,
  grammarLexerAutomaton,
  GrammarSyntaxError,
  lexerStates,
  tokenizeGrammar,
  type Token,
} from '../../src/grammar-format/lexer.js';
import { errorLexerCases, validLexerCases, type ErrorLexerCase } from '../fixtures/lexer-cases.js';

/** 'KIND text line:column', or 'KIND line:column' when the text is empty. */
function describeToken(token: Token): string {
  const text = token.text === '' ? '' : ` ${token.text}`;
  return `${token.kind}${text} ${token.line}:${token.column}`;
}

function captureSyntaxError(testCase: ErrorLexerCase): GrammarSyntaxError {
  try {
    tokenizeGrammar({ text: testCase.text });
  } catch (error) {
    if (error instanceof GrammarSyntaxError) {
      return error;
    }
    throw error;
  }
  throw new Error(`Expected "${testCase.name}" to be rejected`);
}

describe('tokenizeGrammar: valid texts', () => {
  it.each(validLexerCases)('$name: $purpose', (testCase) => {
    expect(tokenizeGrammar({ text: testCase.text }).map(describeToken)).toEqual(testCase.tokens);
  });

  it.each(validLexerCases)('$name: ends in NEWLINE, END_OF_FILE', (testCase) => {
    const kinds = tokenizeGrammar({ text: testCase.text }).map((token) => token.kind);
    expect(kinds.slice(-2)).toEqual(['NEWLINE', 'END_OF_FILE']);
  });
});

describe('tokenizeGrammar: lexical errors', () => {
  it.each(errorLexerCases)('$name: $purpose', (testCase) => {
    const error = captureSyntaxError(testCase);
    expect(error.message).toBe(
      `Line ${testCase.line}, column ${testCase.column}: ${testCase.message}`,
    );
    expect([error.line, error.column]).toEqual([testCase.line, testCase.column]);
  });
});

describe('the automaton of the guide', () => {
  it('has the 13 states q0…q12, numbered in their names, in the order of the state graph', () => {
    expect(lexerStates).toEqual([
      'q0Start',
      'q1ReadingIdentifier',
      'q2ExpectingArrowHead',
      'q3ArrowRead',
      'q4BarRead',
      'q5EpsilonRead',
      'q6ReadingLiteral',
      'q7LiteralRead',
      'q8ExpectingDirectiveName',
      'q9ReadingDirective',
      'q10ReadingComment',
      'q11ReadingSpaces',
      'q12NewlineRead',
    ]);
    lexerStates.forEach((state, position) => {
      expect(state.startsWith(`q${position}`)).toBe(true);
    });
    expect(Object.keys(grammarLexerAutomaton.transitions)).toEqual(lexerStates);
  });

  it('starts every token in q0', () => {
    expect(grammarLexerAutomaton.initialState).toBe('q0Start');
  });

  it('accepts in the same states as the graph', () => {
    expect(grammarLexerAutomaton.acceptingStates).toEqual({
      q1ReadingIdentifier: 'IDENTIFIER',
      q3ArrowRead: 'ARROW',
      q4BarRead: 'BAR',
      q5EpsilonRead: 'EPSILON',
      q7LiteralRead: 'LITERAL',
      q9ReadingDirective: 'DIRECTIVE',
      q10ReadingComment: null,
      q11ReadingSpaces: null,
      q12NewlineRead: 'NEWLINE',
    });
  });

  it('has the row of q0 of the δ table', () => {
    expect(grammarLexerAutomaton.transitions.q0Start).toEqual({
      letter: 'q1ReadingIdentifier',
      hyphen: 'q2ExpectingArrowHead',
      unicodeArrow: 'q3ArrowRead',
      verticalBar: 'q4BarRead',
      epsilonSign: 'q5EpsilonRead',
      singleQuote: 'q6ReadingLiteral',
      percentSign: 'q8ExpectingDirectiveName',
      hash: 'q10ReadingComment',
      whitespace: 'q11ReadingSpaces',
      lineBreak: 'q12NewlineRead',
    });
  });

  it.each([
    ['A', 'letter'],
    ['ñ', 'letter'],
    ['_', 'letter'],
    ['ε', 'epsilonSign'],
    ['7', 'digit'],
    [' ', 'whitespace'],
    ['\t', 'whitespace'],
    ['\r', 'whitespace'],
    ['\n', 'lineBreak'],
    ['-', 'hyphen'],
    ['>', 'greaterThan'],
    ['→', 'unicodeArrow'],
    ['|', 'verticalBar'],
    ["'", 'singleQuote'],
    ['#', 'hash'],
    ['%', 'percentSign'],
    ['@', 'otherCharacter'],
    ['$', 'otherCharacter'],
  ])('classifies %j as %s', (character, characterClass) => {
    expect(classifyCharacter(character)).toBe(characterClass);
  });
});
