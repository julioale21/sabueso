import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import {
  createEnvironmentWithBuiltInGrammars,
  createMemoryEnvironment,
} from './memory-environment.js';

describe('sabueso grammars', () => {
  it('lists every built-in grammar with its sizes, in the two groups', async () => {
    const { environment, output } = createEnvironmentWithBuiltInGrammars();
    expect(await runCommandLine(['grammars'], environment)).toBe(0);
    expect(output()).toMatch(/^Géneros:$/m);
    expect(output()).toMatch(/^Desarrollo:$/m);
    expect(output()).toMatch(/^detective\/g1\s+g1\s+21\s+14\s+40\s+/m);
    expect(output()).toMatch(/^detective\/g0\s+g0\s+10\s+14\s+28\s+/m);
    expect(output()).toMatch(/^meta\s+9\s+9\s+17\s+/m);
    expect(output()).toMatch(/^test-cyclic\s+2\s+1\s+3\s+/m);
    expect(output().indexOf('Géneros:')).toBeLessThan(output().indexOf('Desarrollo:'));
  });

  it('takes no arguments: exit code 2', async () => {
    const { environment, errors } = createMemoryEnvironment();
    expect(await runCommandLine(['grammars', 'g1'], environment)).toBe(2);
    expect(errors()).toBe('Usage: sabueso grammars\n');
  });
});
