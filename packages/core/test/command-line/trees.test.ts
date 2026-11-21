import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso trees', () => {
  it('A1 with G0: draws the first 3 of its 4 trees, numbered, and says it is ambiguous', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['trees', '--grammar', 'g0', 'CRI SOS PIS INT REV'],
        environment,
      }),
    ).toBe(0);
    expect(output()).toContain(
      'The first 3 of 4 trees: the grammar is ambiguous for this input (--max n draws more)',
    );
    expect(output()).toContain('Tree 3:\nRelato');
    expect(output()).not.toContain('Tree 4:');
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

  it('--max 10 draws all 4 trees of A1 with G0', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({
      commandLineArguments: ['trees', '--grammar', 'g0', '--max', '10', 'CRI SOS PIS INT REV'],
      environment,
    });
    expect(output()).toContain('4 trees: the grammar is ambiguous for this input');
    expect(output()).toContain('Tree 4:\nRelato');
    expect(output()).not.toContain('Tree 5:');
  });

  it('--max cuts the list and says there are more', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({
      commandLineArguments: ['trees', '--grammar', 'g0', '--max', '2', 'CRI SOS PIS INT REV'],
      environment,
    });
    expect(output()).toContain('The first 2 of 4 trees');
    expect(output()).not.toContain('Tree 3:');
  });

  it('a cycle gives infinitely many trees: draws the ones that go around no cycle', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({
      commandLineArguments: ['trees', '--grammar', 'test-cyclic', 'a'],
      environment,
    });
    expect(output()).toContain('Infinitely many trees (a cycle A ⇒+ A)');
    expect(output()).toContain('Drawn: 2, the ones that go around no cycle');
    expect(output()).not.toContain('--max n draws more');
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
