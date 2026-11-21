import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso trees', () => {
  it('A1 with G0: 4 trees, numbered, and the ambiguity', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['trees', '--grammar', 'g0', 'CRI SOS PIS INT REV'],
        environment,
      }),
    ).toBe(0);
    expect(output()).toContain('4 trees: the grammar is ambiguous for this input');
    expect(output()).toContain('Tree 4:\nRelato');
    expect(output()).not.toContain('Tree 5:');
  });

  it('A1 with G1: 1 tree', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({
      commandLineArguments: ['trees', '--grammar', 'g1', 'CRI SOS PIS INT REV'],
      environment,
    });
    expect(output()).toContain('1 tree');
    expect(output()).toContain('Tree 1:\nRelato');
  });

  it('--max cuts the list and says there are more', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({
      commandLineArguments: ['trees', '--grammar', 'g0', '--max', '2', 'CRI SOS PIS INT REV'],
      environment,
    });
    expect(output()).toContain('The first 2 trees (there are more');
    expect(output()).not.toContain('Tree 3:');
  });

  it('a rejected input has no trees and exits with 1', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['trees', '--grammar', 'g1', 'CRI REV'],
        environment,
      }),
    ).toBe(1);
    expect(output()).toContain('there are no trees');
  });

  it.each([
    [['trees', '--grammar', 'g0', '--max', '0', 'CRI']],
    [['trees', '--grammar', 'g0', '--max', 'many', 'CRI']],
    [['trees', 'CRI']],
  ])('wrong usage %j exits with 2', async (commandArguments) => {
    const { environment } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine({ commandLineArguments: commandArguments, environment })).toBe(2);
  });
});
