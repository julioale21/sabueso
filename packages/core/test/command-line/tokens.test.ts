import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso tokens', () => {
  it('I6: lists the tokens, reports XYZ at position 1 and exits with 1', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    const code = await runCommandLine(['tokens', '--grammar', 'g1', 'CRI XYZ REV'], environment);
    expect(code).toBe(1);
    expect(output()).toContain('detective/g1: tokens of the story');
    expect(output()).toMatch(/^0\s+CRI\s+yes$/m);
    expect(output()).toMatch(/^1\s+XYZ\s+no$/m);
    expect(output()).toMatch(/^2\s+REV\s+yes$/m);
    expect(output()).toContain('Unknown symbol XYZ at position 1 (event 2): it is not in Σ');
    expect(output()).toContain('Σ = {ATQ, CAP, CNF, CRI, CTX, DSC, ENC, EPI, HAL, INT, PER,');
  });

  it('a story over Σ exits with 0', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    const code = await runCommandLine(['tokens', '--grammar', 'g1', 'CRI PIS REV'], environment);
    expect(code).toBe(0);
    expect(output()).toContain('3 tokens, all in Σ');
  });

  it('the story can also come as separate words', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    const story = ['CRI', 'PIS', 'REV'];
    expect(await runCommandLine(['tokens', '--grammar', 'g0', ...story], environment)).toBe(0);
    expect(output()).toContain('detective/g0: tokens of the story');
  });

  it('an empty story is the empty string ε, and exits with 0', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['tokens', '--grammar', 'g1', ''], environment)).toBe(0);
    expect(output()).toContain('The story is empty: 0 tokens (the empty string ε)');
  });

  it('reads the grammar from a file with --grammar-file', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars({
      'story.grammar': 'Relato -> CRI Pistas REV\nPistas -> PIS Pistas | ε\n',
    });
    const code = await runCommandLine(
      ['tokens', '--grammar-file', 'story.grammar', 'CRI SOS REV'],
      environment,
    );
    expect(code).toBe(1);
    expect(output()).toContain('Unknown symbol SOS at position 1');
    expect(output()).toContain('Σ = {CRI, PIS, REV}');
  });

  it.each([
    [['tokens', 'CRI PIS REV']],
    [['tokens', '--grammar', 'g1', '--grammar-file', 'x.grammar', 'CRI']],
    [['tokens', '--states', '--grammar', 'g1', 'CRI']],
  ])('wrong usage %j exits with 2', async (commandArguments) => {
    const { environment, errors } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(commandArguments, environment)).toBe(2);
    expect(errors()).not.toBe('');
  });

  it('an unknown grammar exits with 2 and lists the valid names', async () => {
    const { environment, errors } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['tokens', '--grammar', 'g2', 'CRI'], environment)).toBe(2);
    expect(errors()).toContain('Unknown grammar: g2. Available grammars: detective/g1');
  });
});
