import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso min-yield', () => {
  it('prints the table of G1 and the length of the shortest story', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['min-yield', '--grammar', 'g1'], environment)).toBe(0);
    expect(output()).toContain('detective/g1: minimum yield');
    expect(output()).toMatch(/^Relato\s+3$/m);
    expect(output()).toMatch(/^MarcoOpc\s+0$/m);
    expect(output()).toContain('The shortest sentence of L(G) has length 3: minYield(Relato) = 3');
  });

  it('says that ε ∈ L(G) when minYield of the start symbol is 0', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['min-yield', '--grammar', 'parentheses'], environment);
    expect(output()).toContain('has length 0: minYield(S) = 0, so ε ∈ L(G)');
  });

  it('marks the symbols that derive no string with ∞', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['min-yield', '--grammar', 'test-useless'], environment);
    expect(output()).toMatch(/^A\s+∞ \(derives no string\)$/m);
  });

  it('says that the language is empty when the start symbol derives nothing', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['min-yield', '--grammar', 'test-empty'], environment);
    expect(output()).toContain('the start symbol derives no string, so L(G) = ∅');
  });

  it.each([
    [['min-yield']],
    [['min-yield', '--grammar', 'g1', 'extra']],
    [['min-yield', '--steps']],
  ])('wrong usage %j exits with 2', async (commandArguments) => {
    const { environment, errors } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(commandArguments, environment)).toBe(2);
    expect(errors()).not.toBe('');
  });
});
