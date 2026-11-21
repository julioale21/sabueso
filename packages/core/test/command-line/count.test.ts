import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

const l1 = readFileSync(new URL('../fixtures/l1.txt', import.meta.url), 'utf8');

describe('sabueso count', () => {
  it('V1 with G0: 8 trees', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    const code = await runCommandLine({
      commandLineArguments: ['count', '--grammar', 'g0', 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP'],
      environment,
    });
    expect(code).toBe(0);
    expect(output()).toContain('8 trees: the grammar is ambiguous for this input');
    expect(output()).toMatch(/Time: \d+ ms/);
  });

  it('L1 from a file with G0: the full number, with its 115 digits', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars({
      files: { 'l1.txt': l1 },
    });
    expect(
      await runCommandLine({
        commandLineArguments: ['count', '--grammar', 'g0', '--file', 'l1.txt'],
        environment,
      }),
    ).toBe(0);
    expect(output()).toContain('detective/g0: 200 events from l1.txt');
    expect(output()).toMatch(/^\d{115} trees \(a number of 115 digits\)/m);
  });

  it('L1 with G1: 1 tree', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars({
      files: { 'l1.txt': l1 },
    });
    await runCommandLine({
      commandLineArguments: ['count', '--grammar', 'g1', '--file', 'l1.txt'],
      environment,
    });
    expect(output()).toContain('1 tree: unambiguous for this input');
  });

  it('a cycle: infinitely many', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({
      commandLineArguments: ['count', '--grammar', 'test-cyclic', 'a'],
      environment,
    });
    expect(output()).toContain('Infinitely many trees');
  });

  it('a rejected input: 0 trees and exit 1', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['count', '--grammar', 'g1', 'CRI REV'],
        environment,
      }),
    ).toBe(1);
    expect(output()).toContain('0 trees');
  });

  it('a missing file is reported', async () => {
    const { environment, errors } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['count', '--grammar', 'g0', '--file', 'nope.txt'],
        environment,
      }),
    ).toBe(1);
    expect(errors()).toContain('Cannot read the story file "nope.txt"');
  });

  it('the story as words and as a file at once is a usage error', async () => {
    const { environment } = createEnvironmentWithBuiltInGrammars({ files: { 'l1.txt': l1 } });
    expect(
      await runCommandLine({
        commandLineArguments: ['count', '--grammar', 'g0', '--file', 'l1.txt', 'CRI'],
        environment,
      }),
    ).toBe(2);
  });
});
