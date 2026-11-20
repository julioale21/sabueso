import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { createMemoryEnvironment } from './memory-environment.js';

describe('sabueso genres', () => {
  it('lists the detective genre with its two grammars and its 14 tags', async () => {
    const { environment, output } = createMemoryEnvironment();
    expect(await runCommandLine(['genres'], environment)).toBe(0);
    expect(output()).toContain('detective: Policial de enigma');
    expect(output()).toContain('Official grammar:    detective/g1 (g1)');
    expect(output()).toContain('Alternative grammar: detective/g0 (g0)');
    expect(output()).toContain('Tags (|Σ| = 14):');
    expect(output()).toMatch(/^CRI\s+Crimen\s+El asesino envenenó a Lord Ashby\.$/m);
    expect(output()).toMatch(/^EPI\s+Epílogo\s+Miller volvió a Londres\.$/m);
  });

  it('takes no arguments: exit code 2', async () => {
    const { environment, errors } = createMemoryEnvironment();
    expect(await runCommandLine(['genres', 'detective'], environment)).toBe(2);
    expect(errors()).toBe('Usage: sabueso genres\n');
  });
});
