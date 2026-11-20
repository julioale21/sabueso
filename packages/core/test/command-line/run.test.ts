import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { formatSet, formatTable } from '../../src/command-line/format.js';
import { createCommandLineProgram } from '../../src/command-line/run.js';
import { createMemoryEnvironment } from './memory-environment.js';

describe('sabueso command line', () => {
  it('help lists the commands', async () => {
    const { environment, output } = createMemoryEnvironment();
    expect(await runCommandLine(['help'], environment)).toBe(0);
    expect(output()).toMatch(/^grammar\s/m);
    expect(output()).toMatch(/^help\s/m);
  });

  it('shows the help when called without arguments', async () => {
    const withoutArguments = createMemoryEnvironment();
    const withHelp = createMemoryEnvironment();
    expect(await runCommandLine([], withoutArguments.environment)).toBe(0);
    await runCommandLine(['help'], withHelp.environment);
    expect(withoutArguments.output()).toBe(withHelp.output());
  });

  it('an unknown command writes to the error output, lists the commands and exits with 2', async () => {
    const { environment, output, errors } = createMemoryEnvironment();
    expect(await runCommandLine(['foo'], environment)).toBe(2);
    expect(output()).toBe('');
    expect(errors()).toContain('Unknown command: foo');
    expect(errors()).toMatch(/^grammar\s/m);
  });
});

describe('createCommandLineProgram', () => {
  it('reports a failing command on the error output and exits with 1', async () => {
    const run = createCommandLineProgram({
      program: 'test',
      commands: [
        {
          name: 'boom',
          description: 'Always fails',
          usage: 'test boom',
          run: () => Promise.reject(new Error('it broke')),
        },
      ],
    });
    const { environment, errors } = createMemoryEnvironment();
    expect(await run(['boom'], environment)).toBe(1);
    expect(errors()).toBe('Error: it broke\n');
  });
});

describe('help', () => {
  it('ends with the built-in grammars, in their two groups', async () => {
    const { environment, output } = createMemoryEnvironment();
    await runCommandLine(['help'], environment);
    expect(output()).toContain('Grammars:\n  Géneros: detective/g1 (g1), detective/g0 (g0)\n');
    expect(output()).toMatch(/^ {2}Desarrollo: meta, arithmetic-ambiguous, /m);
  });
});

describe('format', () => {
  it('formatTable aligns the columns', () => {
    expect(
      formatTable(
        ['Symbol', 'Kind'],
        [
          ['S', 'nonterminal'],
          ['CRI', 'terminal'],
        ],
      ),
    ).toBe(
      ['Symbol  Kind', '------  -----------', 'S       nonterminal', 'CRI     terminal'].join('\n'),
    );
  });

  it('formatSet sorts and removes duplicates', () => {
    expect(formatSet(['c', 'a', 'b', 'a'])).toBe('{a, b, c}');
    expect(formatSet([])).toBe('{}');
  });
});
