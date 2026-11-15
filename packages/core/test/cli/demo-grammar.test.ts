import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/program.js';
import { memoryIo } from './memory-io.js';

describe('sabueso demo-grammar', () => {
  it('prints the 4-tuple of the expression grammar with numbered productions', async () => {
    const { io, stdout } = memoryIo();
    expect(await runCli(['demo-grammar'], io)).toBe(0);
    expect(stdout()).toBe(
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
