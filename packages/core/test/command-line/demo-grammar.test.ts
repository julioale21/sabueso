import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createMemoryEnvironment } from './memory-environment.js';

describe('sabueso demo-grammar', () => {
  it('prints the 4-tuple of the expression grammar with numbered productions', async () => {
    const { environment, output } = createMemoryEnvironment();
    expect(await runCommandLine(['demo-grammar'], environment)).toBe(0);
    expect(output()).toBe(
      [
        'expressions: G = (N, Σ, P, S)',
        'N = {E, T}',
        'Σ = {+, id}',
        'S = E',
        'P:',
        '   0  E → E + T',
        '   1  E → T',
        '   2  T → id',
        '',
      ].join('\n'),
    );
  });
});
