import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

const run = async (commandLineArguments: string[]) => {
  const { environment, output, errors } = createEnvironmentWithBuiltInGrammars();
  const exitCode = await runCommandLine({ commandLineArguments, environment });
  return { exitCode, output: output(), errors: errors() };
};

describe('sabueso pushdown-automaton', () => {
  it('CRI PIS REV with G1: the automaton, ACCEPTED and the table of card 24', async () => {
    const { exitCode, output } = await run([
      'pushdown-automaton',
      '--grammar',
      'g1',
      'CRI PIS REV',
    ]);
    expect(exitCode).toBe(0);
    expect(output).toContain('P = ({q}, Σ, Γ, δ, q, Relato), accepting by empty stack');
    expect(output).toContain('|Σ| = 14, |Γ| = 35 (N ∪ Σ), |δ| = 54 (40 expand, 14 match)');
    expect(output).toContain(
      'ACCEPTED: the stack is empty after the whole input · 23 configurations explored',
    );
    expect(output).toContain('Accepting path (17 transitions: 14 expand, 3 match):');
    expect(output).toContain(
      '0     CRI PIS REV  Relato                                            — (start)',
    );
    expect(output).toContain(
      '4     PIS REV      HallazgoOpc MarcoOpc Investigacion Desenlace      match CRI',
    );
    expect(output).toContain(
      '17    ε            ε                                                 expand (33) EpiOpc → ε',
    );
    expect(output).not.toContain('Transitions:');
  });

  it('with --transitions, lists δ', async () => {
    const { output } = await run([
      'pushdown-automaton',
      '--grammar',
      'parentheses',
      '--transitions',
      '( )',
    ]);
    expect(output).toContain(
      'Transitions:\n  δ(q, ε, S) ∋ (q, ( S ) S)   (0)\n  δ(q, ε, S) ∋ (q, ε)   (1)',
    );
    expect(output).toContain('  δ(q, (, () = {(q, ε)}');
  });

  it('rejects CRI REV with G1 and exits with 1', async () => {
    const { exitCode, output } = await run(['pushdown-automaton', '--grammar', 'g1', 'CRI REV']);
    expect(exitCode).toBe(1);
    expect(output).toContain(
      'REJECTED: no branch empties the stack at the end of the input · 1 configuration explored',
    );
    expect(output).not.toContain('Accepting path');
  });

  it('rejects a symbol outside Σ before running the automaton', async () => {
    const { exitCode, output } = await run(['pushdown-automaton', '--grammar', 'g1', 'CRI XYZ']);
    expect(exitCode).toBe(1);
    expect(output).toContain('XYZ is not in Σ');
  });

  it.each([[['pushdown-automaton']], [['pushdown-automaton', '--grammar', 'g1', '--chart']]])(
    'wrong usage %j exits with 2',
    async (commandArguments) => {
      const { exitCode, errors } = await run(commandArguments);
      expect(exitCode).toBe(2);
      expect(errors).not.toBe('');
    },
  );
});
