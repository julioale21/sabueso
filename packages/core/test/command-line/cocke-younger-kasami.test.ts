import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

const run = async (commandLineArguments: string[]) => {
  const { environment, output, errors } = createEnvironmentWithBuiltInGrammars();
  const exitCode = await runCommandLine({ commandLineArguments, environment });
  return { exitCode, output: output(), errors: errors() };
};

describe('sabueso cocke-younger-kasami', () => {
  it('prints the triangular table of ( ) ( ), ACCEPTED and the tree in FNC', async () => {
    const { exitCode, output } = await run([
      'cocke-younger-kasami',
      '--grammar',
      'parentheses',
      '( ) ( )',
    ]);
    expect(exitCode).toBe(0);
    expect(output).toContain('parentheses: CYK on ( ) ( )');
    expect(output).toContain('Grammar in Chomsky normal form: 19 productions');
    expect(output).toContain('l \\ i  0: (     1: )              2: (     3: )');
    expect(output).toContain('l = 4  {S, S0}');
    expect(output).toContain('l = 3  ∅        {X2, X4, X6, X8}');
    expect(output).toContain('l = 1  {T_(}    {T_)}             {T_(}    {T_)}');
    expect(output).toContain('ACCEPTED: S0 ∈ T[0][4]');
    expect(output).toContain('Tree in Chomsky normal form:\nS0\n├─ T_(');
  });

  it('with --compare, draws the Earley tree next to it and lists what each one has', async () => {
    const { output } = await run([
      'cocke-younger-kasami',
      '--grammar',
      'g1',
      '--compare',
      'CRI PIS REV',
    ]);
    expect(output).toContain('Chomsky normal form (CYK)    Grammar as written (Earley)');
    expect(output).toContain('└─ X1                        │  │  ├─ CRI');
    expect(output).toContain('Only in the CYK tree: X1');
    expect(output).toContain(
      'Only in the Earley tree: Hecho, HallazgoOpc, MarcoOpc, Pasos, Evidencia, Libres, Lineas, Resolucion, Cierre, EpiOpc',
    );
  });

  it('rejects CRI REV with G0 and exits with 1', async () => {
    const { exitCode, output } = await run(['cocke-younger-kasami', '--grammar', 'g0', 'CRI REV']);
    expect(exitCode).toBe(1);
    expect(output).toContain('REJECTED: Relato ∉ T[0][2]');
    expect(output).not.toContain('Tree');
  });

  it('accepts the empty input with parentheses, through S0 → ε', async () => {
    const { exitCode, output } = await run(['cocke-younger-kasami', '--grammar', 'parentheses']);
    expect(exitCode).toBe(0);
    expect(output).toContain('ACCEPTED: S0 → ε is in the grammar, so ε ∈ L(G)');
    expect(output).not.toContain('Table');
  });

  it('rejects a symbol outside Σ before running CYK', async () => {
    const { exitCode, output } = await run(['cocke-younger-kasami', '--grammar', 'g1', 'CRI XYZ']);
    expect(exitCode).toBe(1);
    expect(output).toContain('XYZ is not in Σ');
  });

  it.each([[['cocke-younger-kasami']], [['cocke-younger-kasami', '--grammar', 'g1', '--chart']]])(
    'wrong usage %j exits with 2',
    async (commandArguments) => {
      const { exitCode, errors } = await run(commandArguments);
      expect(exitCode).toBe(2);
      expect(errors).not.toBe('');
    },
  );
});
