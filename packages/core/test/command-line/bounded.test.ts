import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

const run = async (commandLineArguments: string[]) => {
  const { environment, output, errors } = createEnvironmentWithBuiltInGrammars();
  const exitCode = await runCommandLine({ commandLineArguments, environment });
  return { exitCode, output: output(), errors: errors() };
};

describe('sabueso generate', () => {
  it('lists the 8 sentences of G1 up to length 3', async () => {
    const { exitCode, output } = await run(['generate', '--grammar', 'g1', '--max-length', '3']);
    expect(exitCode).toBe(0);
    expect(output).toContain('detective/g1: sentences of length ≤ 3\n\n8 sentences');
    expect(output).toContain('  CRI ATQ REV\n  CRI INT REV');
    expect(output).toContain('  HAL SOS REV');
  });
});

describe('sabueso ambiguity', () => {
  it('finds CRI SOS ATQ REV in G0 and draws its 2 trees', async () => {
    const { exitCode, output } = await run(['ambiguity', '--grammar', 'g0', '--max-length', '4']);
    expect(exitCode).toBe(0);
    expect(output).toContain('WITNESS: CRI SOS ATQ REV has 2 trees, so the grammar is ambiguous');
    expect(output).toContain('Tree 1:\nRelato');
    expect(output).toContain('Tree 2:\nRelato');
  });

  it('with G1 finds none, and says that proves nothing', async () => {
    const { output } = await run(['ambiguity', '--grammar', 'g1', '--max-length', '5']);
    expect(output).toContain('No witness up to length 5');
    expect(output).toContain('ambiguity is undecidable');
    expect(output).toContain('`sabueso predictive-table`');
  });
});

describe('sabueso compare', () => {
  it('G0 vs G1 up to length 3: only G0 has CRI DSC REV and HAL DSC REV', async () => {
    const { exitCode, output } = await run(['compare', 'g0', 'g1', '--max-length', '3']);
    expect(exitCode).toBe(0);
    expect(output).toContain('Only in detective/g0 (2):\n  CRI DSC REV\n  HAL DSC REV');
    expect(output).toContain('Only in detective/g1: none');
    expect(output).toContain('So L(detective/g0) ≠ L(detective/g1).');
  });

  it('two grammars with the same sentences up to k: says it proves nothing', async () => {
    const { output } = await run([
      'compare',
      'arithmetic',
      'arithmetic-ambiguous',
      '--max-length',
      '3',
    ]);
    expect(output).toContain('The same sentences up to length 3');
    expect(output).toContain('equivalence is undecidable');
  });
});

describe('wrong usage of the bounded searches', () => {
  it.each([
    [['generate', '--grammar', 'g1']],
    [['generate', '--grammar', 'g1', '--max-length', 'many']],
    [['generate', '--grammar', 'g1', '--max-length', '20']],
    [['ambiguity', '--max-length', '3']],
    [['compare', 'g0', '--max-length', '3']],
    [['compare', 'g0', 'nope', '--max-length', '3']],
    [['compare', 'g0', 'g1']],
  ])('%j exits with 2', async (commandArguments) => {
    const { exitCode, errors } = await run(commandArguments);
    expect(exitCode).toBe(2);
    expect(errors).not.toBe('');
  });
});
