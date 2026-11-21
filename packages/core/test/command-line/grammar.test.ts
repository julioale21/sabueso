import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

const GRAMMAR_USAGE = 'Usage: sabueso grammar <grammar> | --grammar-file <path> [--parser-trace]';

describe('sabueso grammar', () => {
  it('reads arithmetic.grammar and prints its 4-tuple', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({ commandLineArguments: ['grammar', 'arithmetic'], environment }),
    ).toBe(0);
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
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['grammar', 'arithmetic', '--parser-trace'],
        environment,
      }),
    ).toBe(0);
    expect(output()).toContain('Parser trace (nonterminal [lookahead] → alternative):');
    expect(output()).toMatch(/^File \[IDENTIFIER\] → Element File$/m);
    expect(output()).toMatch(/^ {8}Sequence \[IDENTIFIER\] → Symbols$/m);
    expect(output()).toMatch(/^ {8}MoreAlternatives \[BAR\] → BAR Sequence MoreAlternatives$/m);
    expect(output()).toMatch(/^File \[END_OF_FILE\] → END_OF_FILE$/m);
    expect(output()).toContain('arithmetic: G = (N, Σ, P, S)');
  });

  it('reads the grammars of the genre by id or by alias', async () => {
    const byId = createEnvironmentWithBuiltInGrammars();
    const byAlias = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['grammar', 'detective/g0'],
        environment: byId.environment,
      }),
    ).toBe(0);
    expect(
      await runCommandLine({
        commandLineArguments: ['grammar', 'g0'],
        environment: byAlias.environment,
      }),
    ).toBe(0);
    expect(byId.output()).toContain('  27  Resolucion → REV CNF CAP');
    expect(byAlias.output()).toContain('S = Relato');
    expect(byAlias.output().match(/^ +\d+ {2}\S/gm)).toHaveLength(28);
  });

  it('with --grammar-file, reads any .grammar file', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars({
      files: {
        'story.grammar': '%start Relato\nRelato -> CRI Pistas REV\nPistas → PIS Pistas | ε\n',
      },
    });
    expect(
      await runCommandLine({
        commandLineArguments: ['grammar', '--grammar-file', 'story.grammar'],
        environment,
      }),
    ).toBe(0);
    expect(output()).toContain('story.grammar: G = (N, Σ, P, S)');
    expect(output()).toContain('   2  Pistas → ε');
  });

  it('reports a syntax error with its position and exits with 1', async () => {
    const { environment, errors } = createEnvironmentWithBuiltInGrammars({
      files: {
        'bad.grammar': 'S -> a\nT b\n',
      },
    });
    expect(
      await runCommandLine({
        commandLineArguments: ['grammar', '--grammar-file', 'bad.grammar'],
        environment,
      }),
    ).toBe(1);
    expect(errors()).toBe('Error: Line 2, column 3: Expected \'->\', but found a name ("b")\n');
  });

  it('reports an invalid grammar and exits with 1', async () => {
    const { environment, errors } = createEnvironmentWithBuiltInGrammars({
      files: {
        'bad.grammar': '%terminals a\nS -> b\n',
      },
    });
    expect(
      await runCommandLine({
        commandLineArguments: ['grammar', '--grammar-file', 'bad.grammar'],
        environment,
      }),
    ).toBe(1);
    expect(errors()).toContain('Error: Undeclared symbol "b"');
  });

  it.each([
    [['grammar'], GRAMMAR_USAGE],
    [['grammar', 'arithmetic', '--grammar-file', 'x.grammar'], GRAMMAR_USAGE],
    [['grammar', 'arithmetic', '--states'], 'Unknown option: --states'],
    [
      ['grammar', 'nope'],
      'Unknown grammar: nope. Available grammars: detective/g1, detective/g0, meta, arithmetic-ambiguous, arithmetic, parentheses, epsilon-trap, test-useless, test-empty, test-cyclic',
    ],
  ])('%j is a usage error: exit code 2', async (commandArguments, message) => {
    const { environment, output, errors } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine({ commandLineArguments: commandArguments, environment })).toBe(2);
    expect(errors()).toBe(`${message}\n`);
    expect(output()).toBe('');
  });
});
