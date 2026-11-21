import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

const run = async (commandLineArguments: string[]) => {
  const { environment, output, errors } = createEnvironmentWithBuiltInGrammars();
  const exitCode = await runCommandLine({ commandLineArguments, environment });
  return { exitCode, output: output(), errors: errors() };
};

describe('sabueso differential', () => {
  it('G1 up to length 3: 2955 strings, 8 sentences, 0 discrepancies', async () => {
    const { exitCode, output } = await run([
      'differential',
      '--grammar',
      'g1',
      '--max-length',
      '3',
    ]);
    expect(exitCode).toBe(0);
    expect(output).toContain('Strings: 2955 (all over Σ, |Σ| = 14)');
    expect(output).toContain('Sentences (accepted by Earley): 8');
    expect(output).toContain('Discrepancies: 0');
    expect(output).toContain('The three recognizers agree on every string.');
  });

  it.each([
    [['differential', '--grammar', 'g1']],
    [['differential', '--grammar', 'g1', '--max-length', '7']],
    [['differential', '--max-length', '3']],
  ])('wrong usage %j exits with 2', async (commandArguments) => {
    const { exitCode, errors } = await run(commandArguments);
    expect(exitCode).toBe(2);
    expect(errors).not.toBe('');
  });
});

describe('sabueso bench', () => {
  it('times each stage of CRI PIS REV with G1', async () => {
    const { exitCode, output } = await run(['bench', '--grammar', 'g1', 'CRI PIS REV']);
    expect(exitCode).toBe(0);
    expect(output).toContain('detective/g1: timing of CRI PIS REV');
    expect(output).toContain('ACCEPTED · 3 events');
    expect(output).toMatch(/Recognition \(Earley\)\s+[\d.]+ ms\s+54 items in the chart/);
    expect(output).toMatch(/Tree count\s+[\d.]+ ms\s+1 tree/);
    expect(output).toMatch(/Total\s+[\d.]+ ms/);
  });

  it('a rejected story has no tree: the time shows —', async () => {
    const { exitCode, output } = await run(['bench', '--grammar', 'g1', 'CRI REV']);
    expect(exitCode).toBe(1);
    expect(output).toContain('REJECTED · 2 events');
    expect(output).toMatch(/First tree\s+—\s+rejected: no tree/);
  });

  it('rejects a symbol outside Σ', async () => {
    const { exitCode, output } = await run(['bench', '--grammar', 'g1', 'CRI XYZ']);
    expect(exitCode).toBe(1);
    expect(output).toContain('XYZ is not in Σ');
  });

  it('wrong usage exits with 2', async () => {
    const { exitCode } = await run(['bench', 'CRI']);
    expect(exitCode).toBe(2);
  });
});
