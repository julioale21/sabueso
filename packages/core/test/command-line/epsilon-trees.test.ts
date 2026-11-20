import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso epsilon-trees', () => {
  it('G1 CuerpoLinea: 1 tree, drawn', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine(['epsilon-trees', '--grammar', 'g1', 'CuerpoLinea'], environment),
    ).toBe(0);
    expect(output()).toContain('detective/g1: CuerpoLinea ⇒* ε, 1 tree');
    expect(output()).toContain('Tree 1:\nCuerpoLinea\n└─ ε');
  });

  it('without a symbol, the count of every nullable symbol', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['epsilon-trees', '--grammar', 'g1'], environment);
    expect(output()).toMatch(/^Cierre\s+1 tree$/m);
  });

  it('several ε-trees with a grammar file', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars({
      'choices.grammar': "S -> A A | 'x'\nA -> ε | B\nB -> ε | 'b'\n",
    });
    await runCommandLine(['epsilon-trees', '--grammar-file', 'choices.grammar', 'S'], environment);
    expect(output()).toContain('S ⇒* ε, 4 trees');
    expect(output()).toContain('Tree 4:');
  });

  it('a cycle: infinitely many, and the ones without repeated symbols', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars({
      'cycle.grammar': 'S -> S | ε\n',
    });
    await runCommandLine(['epsilon-trees', '--grammar-file', 'cycle.grammar', 'S'], environment);
    expect(output()).toContain('infinitely many ways');
  });

  it('a symbol that does not derive ε, and a grammar with no nullable symbols', async () => {
    const first = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['epsilon-trees', '--grammar', 'g1', 'Relato'], first.environment);
    expect(first.output()).toContain('Relato does not derive ε');
    const second = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['epsilon-trees', '--grammar', 'g0'], second.environment);
    expect(second.output()).toContain('no nullable symbols');
  });

  it.each([
    [['epsilon-trees']],
    [['epsilon-trees', '--grammar', 'g1', 'NoSuchSymbol']],
    [['epsilon-trees', '--grammar', 'g1', 'A', 'B']],
  ])('wrong usage %j exits with 2', async (commandArguments) => {
    const { environment } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(commandArguments, environment)).toBe(2);
  });
});
