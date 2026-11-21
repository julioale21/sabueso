import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso chomsky-normal-form', () => {
  it('with --until UNIT, prints G1 after START, DEL and UNIT, with what each step changed', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['chomsky-normal-form', '--grammar', 'g1', '--until', 'UNIT'],
        environment,
      }),
    ).toBe(0);
    expect(output()).toContain('detective/g1: conversion to Chomsky normal form');
    expect(output()).toContain('Step 1 · START');
    expect(output()).toContain(
      'Nothing to do: Relato appears on no right side: it stays as the start symbol, no S0 is needed',
    );
    expect(output()).not.toContain('After START');
    expect(output()).toContain('Step 2 · DEL');
    expect(output()).toContain('Added (16):');
    expect(output()).toContain('Removed (10):');
    expect(output()).toContain('  - MarcoOpc → ε');
    expect(output()).toContain('  + Linea → SOS');
    expect(output()).toContain('After DEL (46 productions):');
    expect(output()).toContain('Step 3 · UNIT');
    expect(output()).toContain('Added (33):');
    expect(output()).toContain('  + Investigacion → SOS CuerpoLinea');
    expect(output()).toContain('Removed (10):');
    expect(output()).toContain('  - Investigacion → Pasos');
    expect(output()).toContain('After UNIT (69 productions):');
  });

  it('with --until DEL, stops after DEL', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({
      commandLineArguments: ['chomsky-normal-form', '--grammar', 'g1', '--until', 'del'],
      environment,
    });
    expect(output()).toContain('After DEL (46 productions):');
    expect(output()).not.toContain('UNIT');
  });

  it('keeps S0 → ε for parentheses, whose language contains ε', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['chomsky-normal-form', '--grammar', 'parentheses'],
        environment,
      }),
    ).toBe(0);
    expect(output()).toContain('After START (3 productions):');
    expect(output()).toMatch(/Step 2 · DEL.*\nAdded \(4\):\n {2}\+ S0 → ε/);
    expect(output()).toContain('  - S → ε');
    expect(output()).toContain('After UNIT (9 productions):');
    expect(output()).toContain('   0  S0 → ε');
    expect(output()).toContain('Chomsky normal form ✓ (19 productions)');
  });

  it('without --until, runs the six steps on G1 and ends in FNC with 78 productions', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine({
        commandLineArguments: ['chomsky-normal-form', '--grammar', 'g1'],
        environment,
      }),
    ).toBe(0);
    expect(output()).toContain('Step 4 · USELESS');
    expect(output()).toContain('  - Descarte → DSC Libres');
    expect(output()).toContain('After USELESS (67 productions):');
    expect(output()).toContain('Step 5 · TERM');
    expect(output()).toContain('  + T_CRI → CRI');
    expect(output()).toContain('After TERM (75 productions):');
    expect(output()).toContain('Step 6 · BIN');
    expect(output()).toContain('After BIN (78 productions):');
    expect(output()).toMatch(/Chomsky normal form ✓ \(78 productions\)\n$/);
  });

  it('says when a step has nothing to do, and counts a single production in singular', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({
      commandLineArguments: ['chomsky-normal-form', '--grammar', 'epsilon-trap'],
      environment,
    });
    expect(output()).toContain('After USELESS (1 production):');
    expect(output()).toContain('Nothing to do: no right side of length 2 or more has a terminal');
    expect(output()).toContain('Nothing to do: no right side is longer than 2');
    expect(output()).toContain('Chomsky normal form ✓ (1 production)');
  });

  it('with --until TERM, stops before BIN and prints no verdict', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine({
      commandLineArguments: ['chomsky-normal-form', '--grammar', 'parentheses', '--until', 'term'],
      environment,
    });
    expect(output()).toContain('After TERM (11 productions):');
    expect(output()).not.toContain('BIN');
    expect(output()).not.toContain('Chomsky normal form ✓');
  });

  it.each([
    [['chomsky-normal-form']],
    [['chomsky-normal-form', 'g1']],
    [['chomsky-normal-form', '--grammar', 'g1', '--until', 'CYK']],
    [['chomsky-normal-form', '--grammar', 'g1', '--until']],
    [['chomsky-normal-form', '--grammar', 'g1', '--steps']],
  ])('wrong usage %j exits with 2', async (commandArguments) => {
    const { environment, errors } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine({ commandLineArguments: commandArguments, environment })).toBe(2);
    expect(errors()).not.toBe('');
  });
});
