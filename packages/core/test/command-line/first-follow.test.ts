import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

const MINI_DETECTIVE =
  '%start Relato\nRelato -> Inicio Pistas Final\nInicio -> CRI Hallazgo | HAL\nHallazgo -> HAL | ε\n' +
  'Pistas -> Pista MasPistas\nMasPistas -> Pista MasPistas | ε\nPista -> PIS | INT\n' +
  'Final -> REV Epilogo\nEpilogo -> EPI | ε\n';

describe('sabueso first-follow', () => {
  it('prints FIRST and FOLLOW of each nonterminal of G1 and exits with 0', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['first-follow', '--grammar', 'g1'], environment)).toBe(0);
    expect(output()).toContain('detective/g1: FIRST and FOLLOW');
    expect(output()).toMatch(/^Relato\s+\{CRI, CTX, HAL, PER\}\s+\{\$\}$/m);
    expect(output()).toMatch(/^Pasos\s+\{ATQ, INT, PIS, SOS\}\s+\{REV\}$/m);
    expect(output()).not.toContain('round by round');
  });

  it('with --steps, shows each round of FIRST and of FOLLOW', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars({
      'mini.grammar': MINI_DETECTIVE,
    });
    await runCommandLine(
      ['first-follow', '--grammar-file', 'mini.grammar', '--steps'],
      environment,
    );
    expect(output()).toContain('FIRST, round by round:');
    expect(output()).toMatch(/^2\s+Relato \+= \{CRI, HAL\}; Pistas \+= \{INT, PIS\}/m);
    expect(output()).toContain('FOLLOW, round by round');
    expect(output()).toMatch(/^Hallazgo\s+\{HAL, ε\}\s+\{INT, PIS\}$/m);
  });

  it.each([[['first-follow']], [['first-follow', '--grammar', 'g1', 'extra']]])(
    'wrong usage %j exits with 2',
    async (commandArguments) => {
      const { environment, errors } = createEnvironmentWithBuiltInGrammars();
      expect(await runCommandLine(commandArguments, environment)).toBe(2);
      expect(errors()).not.toBe('');
    },
  );
});
