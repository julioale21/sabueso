import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import {
  createEnvironmentWithBuiltInGrammars,
  createMemoryEnvironment,
} from './memory-environment.js';

describe('sabueso lex', () => {
  it('prints the token table of arithmetic and exits with 0', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['lex', 'arithmetic'], environment)).toBe(0);
    expect(output()).toContain('arithmetic: tokens');
    expect(output()).toMatch(/^IDENTIFIER\s+E\s+3:1$/m);
    expect(output()).toMatch(/^ARROW\s+->\s+3:3$/m);
    expect(output()).toMatch(/^LITERAL\s+id\s+5:18$/m);
    expect(output()).toMatch(/^END_OF_FILE\s+6:1$/m);
    expect(output()).not.toContain('DFA states');
  });

  it('with --states, prints the path through δ of each lexeme of the first rule', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['lex', 'arithmetic', '--states'], environment)).toBe(0);
    expect(output()).toContain("DFA states for line 3: E -> E '+' T | T");
    expect(output()).toMatch(/^E\s+q0 ─E→ q1\s+IDENTIFIER$/m);
    expect(output()).toMatch(/^->\s+q0 ─-→ q2 ─>→ q3\s+ARROW$/m);
    expect(output()).toMatch(/^'\+'\s+q0 ─'→ q6 ─\+→ q6 ─'→ q7\s+LITERAL$/m);
    expect(output()).toMatch(/^␣\s+q0 ─␣→ q11\s+discarded$/m);
    expect(output()).toMatch(/^⏎\s+q0 ─⏎→ q12\s+NEWLINE$/m);
  });

  it('with --grammar-file, reads any .grammar file', async () => {
    const { environment, output } = createMemoryEnvironment({
      'story.grammar': '%start Relato\nRelato -> CRI Pistas REV\nPistas → PIS Pistas | ε\n',
    });
    expect(await runCommandLine(['lex', '--grammar-file', 'story.grammar'], environment)).toBe(0);
    expect(output()).toContain('story.grammar: tokens');
    expect(output()).toMatch(/^START\s+%start\s+1:1$/m);
    expect(output()).toMatch(/^ARROW\s+→\s+3:8$/m);
    expect(output()).toMatch(/^EPSILON\s+ε\s+3:23$/m);
  });

  it('with --grammar-file and --states, traces the first rule, skipping comments and blank lines', async () => {
    const { environment, output } = createMemoryEnvironment({
      'story.grammar': '# comment\n\nS -> a\n',
    });
    await runCommandLine(['lex', '--grammar-file', 'story.grammar', '--states'], environment);
    expect(output()).toContain('DFA states for line 3: S -> a');
  });

  it('with --states on a file without rules, says there is nothing to trace', async () => {
    const { environment, output } = createMemoryEnvironment({ 'empty.grammar': '# only\n' });
    await runCommandLine(['lex', '--grammar-file', 'empty.grammar', '--states'], environment);
    expect(output()).toContain('DFA states: the file has no rule to trace');
  });

  it('reports a lexical error of the file with its position and exits with 1', async () => {
    const { environment, errors } = createMemoryEnvironment({ 'bad.grammar': "S -> a\nE -> '+\n" });
    expect(await runCommandLine(['lex', '--grammar-file', 'bad.grammar'], environment)).toBe(1);
    expect(errors()).toBe(
      'Error: Line 2, column 6: Unterminated literal: missing the closing quote\n',
    );
  });

  it('reports a file that cannot be read and exits with 1', async () => {
    const { environment, errors } = createMemoryEnvironment();
    expect(await runCommandLine(['lex', '--grammar-file', 'missing.grammar'], environment)).toBe(1);
    expect(errors()).toBe('Error: Cannot read the grammar file "missing.grammar"\n');
  });

  it.each([
    [['lex'], 'Usage: sabueso lex <grammar> | --grammar-file <path> [--states]'],
    [
      ['lex', 'arithmetic', 'extra'],
      'Usage: sabueso lex <grammar> | --grammar-file <path> [--states]',
    ],
    [
      ['lex', 'arithmetic', '--grammar-file', 'x.grammar'],
      'Usage: sabueso lex <grammar> | --grammar-file <path> [--states]',
    ],
    [['lex', '--grammar-file'], 'Missing value for --grammar-file'],
    [['lex', 'arithmetic', '--verbose'], 'Unknown option: --verbose'],
    [
      ['lex', 'nope'],
      'Unknown grammar: nope. Available grammars: detective/g1, detective/g0, meta, arithmetic-ambiguous, arithmetic, parentheses, epsilon-trap, test-useless, test-empty, test-cyclic',
    ],
  ])('%j is a usage error: exit code 2', async (commandArguments, message) => {
    const { environment, output, errors } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(commandArguments, environment)).toBe(2);
    expect(errors()).toBe(`${message}\n`);
    expect(output()).toBe('');
  });
});
