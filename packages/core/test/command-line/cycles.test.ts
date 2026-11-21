import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso cycles', () => {
  it('test-cyclic: prints S ⇒+ A ⇒+ S and exits with 0', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['cycles', '--grammar', 'test-cyclic'],
        environment,
      }),
    ).toBe(0);
    expect(output()).toContain('1 cycle(s): some string has infinitely many trees');
    expect(output()).toContain('  S ⇒+ A ⇒+ S');
    expect(output()).not.toContain('Unit graph');
  });

  it('G1 has no cycles', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({ commandLineArguments: ['cycles', '--grammar', 'g1'], environment });
    expect(output()).toContain('No cycles: every string has finitely many trees');
  });

  it('with --graph, prints the unit graph, with — for a symbol without edges', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({
      commandLineArguments: ['cycles', '--grammar', 'g1', '--graph'],
      environment,
    });
    expect(output()).toContain('Unit graph (A → B when A → α B β with α and β nullable):');
    expect(output()).toMatch(/^Pasos\s+Evidencia, Linea$/m);
    expect(output()).toMatch(/^Relato\s+—$/m);
  });

  it('finds a cycle hidden behind nullable symbols in a --grammar-file', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars({
      files: {
        'hidden.grammar': "S -> A S B | 'x'\nA -> ε | 'a'\nB -> ε | 'b'\n",
      },
    });
    await runCommandLine({
      commandLineArguments: ['cycles', '--grammar-file', 'hidden.grammar'],
      environment,
    });
    expect(output()).toContain('  S ⇒+ S');
  });

  it.each([[['cycles']], [['cycles', '--grammar', 'g1', 'extra']], [['cycles', '--steps']]])(
    'wrong usage %j exits with 2',
    async (commandArguments) => {
      const { environment, errors } = createEnvironmentWithBuiltInGrammars();
      expect(await runCommandLine({ commandLineArguments: commandArguments, environment })).toBe(2);
      expect(errors()).not.toBe('');
    },
  );
});
