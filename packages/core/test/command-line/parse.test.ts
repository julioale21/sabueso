import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso parse', () => {
  it('A1 with G0: accepted, 4 trees (ambiguous), tree 1 and its derivation', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['parse', '--grammar', 'g0', 'CRI SOS PIS INT REV'],
        environment,
      }),
    ).toBe(0);
    expect(output()).toContain('ACCEPTED');
    expect(output()).toContain('Trees: 4 (ambiguous for this input)');
    expect(output()).toContain('Tree 1:\nRelato');
    expect(output()).not.toContain('Tree 2:');
    expect(output()).toContain('Leftmost derivation of tree 1:');
  });

  it('--trees shows more trees', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({
      commandLineArguments: ['parse', '--grammar', 'g0', '--trees', '4', 'CRI SOS PIS INT REV'],
      environment,
    });
    expect(output()).toContain('Tree 4:');
  });

  it('a rejected story shows its diagnosis and exits with 1', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['parse', '--grammar', 'g1', 'CTX PER PIS REV'],
        environment,
      }),
    ).toBe(1);
    expect(output()).toContain('REJECTED · position 2 (event 3) · found PIS · expected: CRI, HAL');
  });

  it('--trace adds the steps of Earley', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({
      commandLineArguments: ['parse', '--grammar', 'g1', '--trace', 'CRI PIS REV'],
      environment,
    });
    expect(output()).toContain('Trace (53 events):');
    expect(output()).toContain('#8 S1 SCAN Hecho → CRI • HallazgoOpc, 0 ← token 0 CRI');
  });

  it('L1 from a file with G1', async () => {
    const l1 = readFileSync(new URL('../fixtures/l1.txt', import.meta.url), 'utf8');
    const { environment, output } = createEnvironmentWithBuiltInGrammars({
      files: { 'l1.txt': l1 },
    });
    expect(
      await runCommandLine({
        commandLineArguments: ['parse', '--grammar', 'g1', '--file', 'l1.txt'],
        environment,
      }),
    ).toBe(0);
    expect(output()).toContain('Trees: 1');
  });

  it('a bad --trees is a usage error', async () => {
    const { environment } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['parse', '--grammar', 'g1', '--trees', '0', 'CRI PIS REV'],
        environment,
      }),
    ).toBe(2);
  });
});
