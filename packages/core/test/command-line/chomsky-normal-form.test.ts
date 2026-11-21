import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso chomsky-normal-form', () => {
  it('with --until UNIT, prints G1 after START, DEL and UNIT, with what each step changed', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine(
        ['chomsky-normal-form', '--grammar', 'g1', '--until', 'UNIT'],
        environment,
      ),
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
    await runCommandLine(['chomsky-normal-form', '--grammar', 'g1', '--until', 'del'], environment);
    expect(output()).toContain('After DEL (46 productions):');
    expect(output()).not.toContain('UNIT');
  });

  it('keeps S0 → ε for parentheses, whose language contains ε', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine(['chomsky-normal-form', '--grammar', 'parentheses'], environment),
    ).toBe(0);
    expect(output()).toContain('After START (3 productions):');
    expect(output()).toMatch(/Step 2 · DEL.*\nAdded \(4\):\n {2}\+ S0 → ε/);
    expect(output()).toContain('  - S → ε');
    expect(output()).toContain('After UNIT (9 productions):');
    expect(output()).toContain('   0  S0 → ε');
  });

  it.each([
    [['chomsky-normal-form']],
    [['chomsky-normal-form', 'g1']],
    [['chomsky-normal-form', '--grammar', 'g1', '--until', 'BIN']],
    [['chomsky-normal-form', '--grammar', 'g1', '--until']],
    [['chomsky-normal-form', '--grammar', 'g1', '--steps']],
  ])('wrong usage %j exits with 2', async (commandArguments) => {
    const { environment, errors } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(commandArguments, environment)).toBe(2);
    expect(errors()).not.toBe('');
  });
});
