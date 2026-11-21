import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso trace', () => {
  it('G1 with CRI PIS REV: the numbered events, and ACCEPTED', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['trace', '--grammar', 'g1', 'CRI PIS REV'],
        environment,
      }),
    ).toBe(0);
    expect(output()).toContain('detective/g1: trace of CRI PIS REV');
    expect(output()).toContain('53 events');
    expect(output()).toMatch(
      /^#1\s+S0\s+PREDICTOR\s+Relato → • Planteo Investigacion Desenlace, 0/m,
    );
    expect(output()).toMatch(/^#8\s+S1\s+SCANNER\s+Hecho → CRI • HallazgoOpc, 0\s+← token 0 CRI$/m);
    expect(output()).toMatch(
      /^#11\s+S1\s+NULLABLE\s+Hecho → CRI HallazgoOpc •, 0\s+← HallazgoOpc ⇒\* ε$/m,
    );
    expect(output()).toContain('ACCEPTED');
  });

  it('G0 with A1 marks the items reached again', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({
      commandLineArguments: ['trace', '--grammar', 'g0', 'CRI SOS PIS INT REV'],
      environment,
    });
    expect(output()).toContain('(again: one more link)');
  });

  it('a rejected input exits with 1', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['trace', '--grammar', 'g1', 'CRI REV'],
        environment,
      }),
    ).toBe(1);
    expect(output()).toContain('REJECTED');
  });

  it('a symbol outside Σ is rejected before tracing', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['trace', '--grammar', 'g1', 'CRI XYZ'],
        environment,
      }),
    ).toBe(1);
    expect(output()).toContain('XYZ is not in Σ');
  });

  it('wrong usage exits with 2', async () => {
    const { environment } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine({ commandLineArguments: ['trace', 'CRI'], environment })).toBe(2);
  });
});
