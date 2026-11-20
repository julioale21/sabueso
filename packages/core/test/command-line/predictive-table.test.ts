import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso predictive-table', () => {
  it('G0: marks the conflicts and ends with "Not LL(1)", exit 0', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['predictive-table', '--grammar', 'g0'], environment)).toBe(0);
    expect(output()).toContain('detective/g0: LL(1) table M[A, a]');
    expect(output()).toMatch(/^Linea\s.*20 21 ✗$/m);
    expect(output()).toContain('M[Pasos, PIS]: Pasos → Paso  |  Pasos → Pasos Pasos');
    expect(output()).toMatch(/Not LL\(1\): \d+ conflict\(s\)/);
  });

  it('G1: no conflicts, LL(1) so unambiguous', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['predictive-table', '--grammar', 'g1'], environment);
    expect(output()).toContain('LL(1): no cell has two productions, so the grammar is unambiguous');
    expect(output()).not.toContain('✗');
    expect(output()).toContain('Productions:');
  });

  it.each([[['predictive-table']], [['predictive-table', '--grammar', 'g1', 'x']]])(
    'wrong usage %j exits with 2',
    async (commandArguments) => {
      const { environment, errors } = createEnvironmentWithBuiltInGrammars();
      expect(await runCommandLine(commandArguments, environment)).toBe(2);
      expect(errors()).not.toBe('');
    },
  );
});

describe('sabueso analyze', () => {
  it('G1: one report with every analysis of steps 7 to 12', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['analyze', '--grammar', 'g1'], environment)).toBe(0);
    expect(output()).toContain('detective/g1: analysis');
    expect(output()).toMatch(/^Size\s+\|N\| = 21, \|Σ\| = 14, \|P\| = 40/m);
    expect(output()).toMatch(/^Shortest sentence\s+length 3/m);
    expect(output()).toMatch(/^Useless symbols\s+∅/m);
    expect(output()).toMatch(/^Cycles \(A ⇒\+ A\)\s+none/m);
    expect(output()).toMatch(/^LL\(1\)\s+yes: 0 conflicts, so unambiguous/m);
  });

  it('test-cyclic: shows the cycle', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['analyze', '--grammar', 'test-cyclic'], environment);
    expect(output()).toMatch(/^Cycles \(A ⇒\+ A\)\s+S ⇒\+ A ⇒\+ S/m);
  });

  it('wrong usage exits with 2', async () => {
    const { environment } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['analyze'], environment)).toBe(2);
  });
});
