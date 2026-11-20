import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { builtInGrammarPath, findBuiltInGrammar } from '../../src/command-line/grammars.js';
import { runCommandLine } from '../../src/command-line/program.js';
import { createMemoryEnvironment } from './memory-environment.js';

/** A memory environment holding the real arithmetic.grammar, plus extra files. */
function environmentWith(files: Record<string, string> = {}) {
  const grammar = findBuiltInGrammar('arithmetic');
  if (grammar === undefined) {
    throw new Error('arithmetic is not a built-in grammar');
  }
  const path = builtInGrammarPath(grammar);
  return createMemoryEnvironment({ [path]: readFileSync(path, 'utf8'), ...files });
}

const GRAMMAR_USAGE = 'Usage: sabueso grammar <grammar> | --grammar-file <path> [--parser-trace]';

describe('sabueso grammar', () => {
  it('reads arithmetic.grammar and prints its 4-tuple', async () => {
    const { environment, output } = environmentWith();
    expect(await runCommandLine(['grammar', 'arithmetic'], environment)).toBe(0);
    expect(output()).toBe(
      [
        'arithmetic: G = (N, Σ, P, S)',
        'N = {E, F, T}',
        'Σ = {(, ), *, +, id}',
        'S = E',
        'P:',
        '   0  E → E + T',
        '   1  E → T',
        '   2  T → T * F',
        '   3  T → F',
        '   4  F → ( E )',
        '   5  F → id',
        '',
      ].join('\n'),
    );
  });

  it('with --parser-trace, prints each decision of the parser before the grammar', async () => {
    const { environment, output } = environmentWith();
    expect(await runCommandLine(['grammar', 'arithmetic', '--parser-trace'], environment)).toBe(0);
    expect(output()).toContain('Parser trace (nonterminal [lookahead] → alternative):');
    expect(output()).toMatch(/^File \[IDENTIFIER\] → Element File$/m);
    expect(output()).toMatch(/^ {8}Sequence \[IDENTIFIER\] → Symbols$/m);
    expect(output()).toMatch(/^ {8}MoreAlternatives \[BAR\] → BAR Sequence MoreAlternatives$/m);
    expect(output()).toMatch(/^File \[END_OF_FILE\] → END_OF_FILE$/m);
    expect(output()).toContain('arithmetic: G = (N, Σ, P, S)');
  });

  it('with --grammar-file, reads any .grammar file', async () => {
    const { environment, output } = environmentWith({
      'story.grammar': '%start Relato\nRelato -> CRI Pistas REV\nPistas → PIS Pistas | ε\n',
    });
    expect(await runCommandLine(['grammar', '--grammar-file', 'story.grammar'], environment)).toBe(
      0,
    );
    expect(output()).toContain('story.grammar: G = (N, Σ, P, S)');
    expect(output()).toContain('   2  Pistas → ε');
  });

  it('reports a syntax error with its position and exits with 1', async () => {
    const { environment, errors } = environmentWith({ 'bad.grammar': 'S -> a\nT b\n' });
    expect(await runCommandLine(['grammar', '--grammar-file', 'bad.grammar'], environment)).toBe(1);
    expect(errors()).toBe('Error: Line 2, column 3: Expected \'->\', but found a name ("b")\n');
  });

  it('reports an invalid grammar and exits with 1', async () => {
    const { environment, errors } = environmentWith({ 'bad.grammar': '%terminals a\nS -> b\n' });
    expect(await runCommandLine(['grammar', '--grammar-file', 'bad.grammar'], environment)).toBe(1);
    expect(errors()).toContain('Error: Undeclared symbol "b"');
  });

  it.each([
    [['grammar'], GRAMMAR_USAGE],
    [['grammar', 'arithmetic', '--grammar-file', 'x.grammar'], GRAMMAR_USAGE],
    [['grammar', 'arithmetic', '--states'], 'Unknown option: --states'],
    [['grammar', 'nope'], 'Unknown grammar: nope. Available grammars: arithmetic'],
  ])('%j is a usage error: exit code 2', async (commandArguments, message) => {
    const { environment, output, errors } = environmentWith();
    expect(await runCommandLine(commandArguments, environment)).toBe(2);
    expect(errors()).toBe(`${message}\n`);
    expect(output()).toBe('');
  });
});
