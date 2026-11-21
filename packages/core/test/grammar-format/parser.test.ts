// Runs the .grammar parser on every case of test/fixtures/parser-cases.ts, and checks the
// trace of its decisions.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatProduction, GrammarBuildError } from '../../src/grammar/build.js';
import { GrammarSyntaxError, tokenizeGrammar } from '../../src/grammar-format/lexer.js';
import { parseGrammarFile, parseGrammarText } from '../../src/grammar-format/parser.js';
import {
  errorParserCases,
  validParserCases,
  type ErrorParserCase,
} from '../fixtures/parser-cases.js';

function captureError(testCase: ErrorParserCase): unknown {
  try {
    parseGrammarText({ text: testCase.text, name: 'test' });
  } catch (error) {
    return error;
  }
  throw new Error(`Expected "${testCase.name}" to be rejected`);
}

describe('parseGrammarText: valid files', () => {
  it.each(validParserCases)('$name: $purpose', (testCase) => {
    const grammar = parseGrammarText({ text: testCase.text, name: 'test' });
    expect(grammar.start).toBe(testCase.start);
    expect([...grammar.terminals]).toEqual(testCase.terminals);
    expect(grammar.productions.map(formatProduction)).toEqual(testCase.productions);
  });

  it('reads arithmetic.grammar into the same grammar that was built by hand', () => {
    const text = readFileSync(
      new URL('../../grammars/test/arithmetic.grammar', import.meta.url),
      'utf8',
    );
    const grammar = parseGrammarText({ text, name: 'arithmetic' });
    expect([...grammar.nonterminals]).toEqual(['E', 'T', 'F']);
    expect(grammar.productions.map(formatProduction)).toEqual([
      'E → E + T',
      'E → T',
      'T → T * F',
      'T → F',
      'F → ( E )',
      'F → id',
    ]);
  });

  it('keeps literals apart from identifiers in the parsed rules', () => {
    const file = parseGrammarFile(tokenizeGrammar("E -> E '+' T\n"));
    expect(file.rules).toEqual([{ leftSide: 'E', rightSide: ['E', { literal: '+' }, 'T'] }]);
    expect(file.start).toBeUndefined();
    expect(file.declaredTerminals).toBeUndefined();
  });
});

describe('parseGrammarText: rejected files', () => {
  it.each(errorParserCases)('$name: $purpose', (testCase) => {
    const error = captureError(testCase);
    if (testCase.kind === 'syntax') {
      expect(error).toBeInstanceOf(GrammarSyntaxError);
      const syntaxError = error as GrammarSyntaxError;
      expect(syntaxError.message).toBe(
        `Line ${testCase.line}, column ${testCase.column}: ${testCase.message}`,
      );
      expect([syntaxError.line, syntaxError.column]).toEqual([testCase.line, testCase.column]);
    } else {
      expect(error).toBeInstanceOf(GrammarBuildError);
      expect((error as GrammarBuildError).message).toBe(testCase.message);
    }
  });
});

describe('the parser trace', () => {
  it('shows every decision with the lookahead that made it, nested by depth', () => {
    const steps = parseGrammarFile(tokenizeGrammar('A -> a | ε\n')).trace;
    const lines = steps.map(
      (step) =>
        `${'  '.repeat(step.depth)}${step.nonterminal} [${step.lookahead.kind}] → ${step.alternative}`,
    );
    expect(lines).toEqual([
      'File [IDENTIFIER] → Element File',
      '  Element [IDENTIFIER] → Rule',
      '    Rule [IDENTIFIER] → IDENTIFIER ARROW Alternatives NEWLINE',
      '      Alternatives [IDENTIFIER] → Sequence MoreAlternatives',
      '        Sequence [IDENTIFIER] → Symbols',
      '          Symbols [IDENTIFIER] → Symbol Symbols',
      '            Symbol [IDENTIFIER] → IDENTIFIER',
      '            Symbols [BAR] → ε',
      '        MoreAlternatives [BAR] → BAR Sequence MoreAlternatives',
      '          Sequence [EPSILON] → EPSILON',
      '          MoreAlternatives [NEWLINE] → ε',
      'File [END_OF_FILE] → END_OF_FILE',
    ]);
  });

  it('chooses the alternative of Directive by its lookahead: START or TERMINALS', () => {
    const steps = parseGrammarFile(tokenizeGrammar('%start S\n%terminals a\nS -> a\n')).trace;
    const directives = steps
      .filter((step) => step.nonterminal === 'Directive')
      .map((step) => `[${step.lookahead.kind}] → ${step.alternative}`);
    expect(directives).toEqual([
      '[START] → START IDENTIFIER NEWLINE',
      '[TERMINALS] → TERMINALS Symbols NEWLINE',
    ]);
  });
});
