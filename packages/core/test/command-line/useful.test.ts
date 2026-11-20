import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso useful', () => {
  it('test-useless: reports A and C as useless and prints the grammar without them', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['useful', '--grammar', 'test-useless'], environment)).toBe(0);
    expect(output()).toContain('Not productive: {A}');
    expect(output()).toContain('Not reachable (once those are removed): {C}');
    expect(output()).toContain('Useless: {A, C}');
    expect(output()).toContain('Without useless symbols:');
    expect(output()).toMatch(/^\s+0 {2}S → b$/m);
  });

  it('with --steps, shows the rounds of both fixed points, reachable from round 0', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['useful', '--grammar', 'test-useless', '--steps'], environment);
    expect(output()).toContain('Productive (A ⇒* w, w ∈ Σ*), round by round:');
    expect(output()).toMatch(/^1\s+2\s+C, S$/m);
    expect(output()).toContain('Reachable from the start symbol, round by round:');
    expect(output()).toMatch(/^0\s+1\s+S \(start\)$/m);
  });

  it('test-empty: says that L(G) = ∅', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['useful', '--grammar', 'test-empty', '--steps'], environment);
    expect(output()).toContain('L(G) = ∅: the start symbol S is not productive');
    expect(output()).not.toContain('Reachable from the start symbol');
  });

  it('G1: no useless symbols, and no second grammar is printed', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['useful', '--grammar', 'g1'], environment);
    expect(output()).toContain('Useless: ∅. Every symbol takes part in some sentence of L(G)');
    expect(output()).toContain('L(G) ≠ ∅');
    expect(output()).not.toContain('Without useless symbols');
  });

  it.each([[['useful']], [['useful', '--grammar', 'g1', 'extra']], [['useful', '--trace']]])(
    'wrong usage %j exits with 2',
    async (commandArguments) => {
      const { environment, errors } = createEnvironmentWithBuiltInGrammars();
      expect(await runCommandLine(commandArguments, environment)).toBe(2);
      expect(errors()).not.toBe('');
    },
  );
});
