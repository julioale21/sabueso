import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createEnvironmentWithBuiltInGrammars } from './memory-environment.js';

describe('sabueso earley', () => {
  it('accepts id + id * id with arithmetic and exits with 0', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    const code = await runCommandLine(
      ['earley', '--grammar', 'arithmetic', 'id + id * id'],
      environment,
    );
    expect(code).toBe(0);
    expect(output()).toContain('arithmetic: id + id * id');
    expect(output()).toContain('ACCEPTED: the input is a sentence of L(G)');
    expect(output()).not.toContain('S0');
  });

  it('rejects I3 with G0 and exits with 1', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['earley', '--grammar', 'g0', 'CRI REV'], environment)).toBe(1);
    expect(output()).toContain(
      'REJECTED · position 1 (event 2) · found REV · expected: ATQ, CTX, DSC, ENC, HAL, INT, PER, PIS, SOS',
    );
  });

  it('with --chart, prints every set with its items, origins and operations', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['earley', '--grammar', 'arithmetic', '--chart', 'id + id'], environment);
    expect(output()).toContain('S0: 7 items');
    expect(output()).toMatch(/^1\s+\$S → • E\s+0\s+initial$/m);
    expect(output()).toContain('S1 (after id): 6 items');
    expect(output()).toMatch(/^1\s+F → id •\s+0\s+S from S0#7$/m);
    expect(output()).toMatch(/^2\s+T → F •\s+0\s+C from S0#5$/m);
    expect(output()).toContain('S2 (after +)');
    expect(output()).toMatch(/^1\s+E → E \+ • T\s+0\s+S from S1#6$/m);
  });

  it('a symbol outside Σ is rejected before running Earley', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['earley', '--grammar', 'g0', 'CRI XYZ'], environment)).toBe(1);
    expect(output()).toContain('REJECTED · position 1 (event 2) · XYZ is not in Σ');
  });

  it('the empty input is shown as such', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['earley', '--grammar', 'parentheses', ''], environment)).toBe(0);
    expect(output()).toContain('parentheses: (empty input)');
  });

  it('wrong usage exits with 2', async () => {
    const { environment } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['earley', 'id'], environment)).toBe(2);
  });
});

describe('sabueso earley and the ε fix (step 15)', () => {
  it('G1: --chart prints exactly the chart of section 9.6, item by item', async () => {
    const { g1ChartOfCriPisRev } = await import('../fixtures/g1-chart-cri-pis-rev.js');
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine(['earley', '--grammar', 'g1', '--chart', 'CRI PIS REV'], environment),
    ).toBe(0);
    const rows = output()
      .split('\n')
      .filter((line) => /^\d+\s{2}/.test(line))
      .map((line) => line.split(/\s{2,}/));
    expect(rows.map(([, item, origin, how]) => ({ item, origin: Number(origin), how }))).toEqual(
      g1ChartOfCriPisRev.map(({ item, origin, how }) => ({ item, origin, how })),
    );
    expect(output()).toContain('S1 (after CRI): 19 items');
  });

  it('epsilon-trap accepts x', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['earley', '--grammar', 'epsilon-trap', 'x'], environment)).toBe(0);
    expect(output()).toContain('ACCEPTED');
  });

  it('with --no-epsilon-fix, epsilon-trap rejects x and S → A A • x is missing', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    const code = await runCommandLine(
      ['earley', '--grammar', 'epsilon-trap', '--chart', '--no-epsilon-fix', 'x'],
      environment,
    );
    expect(code).toBe(1);
    expect(output()).toContain('Without the ε fix');
    expect(output()).toContain('S → A • A x');
    expect(output()).not.toContain('S → A A • x');
    expect(output()).toContain('REJECTED');
  });
});

describe('sabueso earley: the diagnosis (step 16)', () => {
  it('G1 with CTX PER PIS REV: position 2 (event 3), found PIS, expected CRI or HAL; exit 1', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(
      await runCommandLine(['earley', '--grammar', 'g1', 'CTX PER PIS REV'], environment),
    ).toBe(1);
    expect(output()).toContain('REJECTED · position 2 (event 3) · found PIS · expected: CRI, HAL');
  });

  it('an input that ends too soon says "end of input"', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['earley', '--grammar', 'g1', 'CRI PIS'], environment);
    expect(output()).toContain(
      'REJECTED · position 2 (end of input) · expected: ATQ, INT, PIS, REV, SOS',
    );
  });

  it('when nothing could come next, it says "incomplete input"', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    await runCommandLine(['earley', '--grammar', 'test-empty', ''], environment);
    expect(output()).toContain('REJECTED · position 0 (end of input) · incomplete input');
  });
});
