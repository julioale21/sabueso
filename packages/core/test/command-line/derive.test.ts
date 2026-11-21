import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso derive', () => {
  it('A1 with G1: 18 steps, numbered, with the production applied', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['derive', '--grammar', 'g1', 'CRI SOS PIS INT REV'],
        environment,
      }),
    ).toBe(0);
    expect(output()).toContain('Tree 1, 18 steps:');
    expect(output()).toMatch(/^0\s+Relato$/m);
    expect(output()).toMatch(/^4\s+⇒ CRI MarcoOpc Investigacion Desenlace\s+HallazgoOpc → ε$/m);
    expect(output()).toMatch(/^18\s+⇒ CRI SOS PIS INT REV\s+EpiOpc → ε$/m);
  });

  it('--tree chooses another tree: G0 tree 2 of A1', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({
      commandLineArguments: ['derive', '--grammar', 'g0', '--tree', '2', 'CRI SOS PIS INT REV'],
      environment,
    });
    expect(output()).toContain('Tree 2,');
  });

  it('a tree number beyond the trees is a usage error', async () => {
    const { environment, errors } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['derive', '--grammar', 'g1', '--tree', '2', 'CRI PIS REV'],
        environment,
      }),
    ).toBe(2);
    expect(errors()).toContain('fewer than 2 trees');
  });

  it('a rejected input has no derivation', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['derive', '--grammar', 'g1', 'CRI REV'],
        environment,
      }),
    ).toBe(1);
    expect(output()).toContain('no derivation');
  });

  it('a bad --tree is a usage error', async () => {
    const { environment } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['derive', '--grammar', 'g1', '--tree', '0', 'CRI PIS REV'],
        environment,
      }),
    ).toBe(2);
  });
});
