import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso nullable', () => {
  it('prints the 10 nullable symbols of G1 and exits with 0', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['nullable', '--grammar', 'g1'], environment)).toBe(0);
    expect(output()).toContain('detective/g1: nullable symbols (A ⇒* ε)');
    expect(output()).toContain(
      'Nullable = {CapOpc, Cierre, CtxOpc, CuerpoLinea, EpiOpc, HallazgoOpc, Libres, Lineas, MarcoOpc, PerOpc} (10 of 21 nonterminals)',
    );
    expect(output()).not.toContain('Round');
  });

  it('with --steps, shows at least two rounds and ends with the fixed point', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['nullable', '--grammar', 'g1', '--steps'], environment);
    expect(output()).toMatch(/^1\s+10\s+CapOpc, Cierre, CtxOpc/m);
    expect(output()).toMatch(/^2\s+10\s+\(none: fixed point\)$/m);
  });

  it('writes ∅ for a grammar without nullable symbols', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['nullable', '--grammar', 'g0'], environment);
    expect(output()).toContain('Nullable = ∅ (0 of 10 nonterminals)');
  });

  it('with --grammar-file, shows one new symbol per round', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars({
      'chain.grammar': "S -> A B 'x' | B B\nB -> A A | 'b'\nA -> 'a' | ε\n",
    });
    await runCommandLine(['nullable', '--grammar-file', 'chain.grammar', '--steps'], environment);
    expect(output()).toMatch(/^1\s+1\s+A$/m);
    expect(output()).toMatch(/^2\s+2\s+B$/m);
    expect(output()).toMatch(/^3\s+3\s+S$/m);
    expect(output()).toMatch(/^4\s+3\s+\(none: fixed point\)$/m);
  });

  it.each([
    [['nullable']],
    [['nullable', 'g1']],
    [['nullable', '--grammar', 'g1', 'extra']],
    [['nullable', '--grammar', 'g1', '--trace']],
  ])('wrong usage %j exits with 2', async (commandArguments) => {
    const { environment, errors } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(commandArguments, environment)).toBe(2);
    expect(errors()).not.toBe('');
  });
});
