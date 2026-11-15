import type { CliIo } from '@sabueso/core';
import { describe, expect, it } from 'vitest';
import { versionCommand } from '../../src/cli/commands/version.js';

describe('sabueso-nl version', () => {
  it('prints the package and core versions and exits with 0', async () => {
    let out = '';
    const io: CliIo = {
      stdout: (text) => {
        out += text;
      },
      stderr: () => {},
      readFile: (path) => Promise.reject(new Error(`File not found: ${path}`)),
    };
    expect(await versionCommand.run([], io)).toBe(0);
    expect(out).toBe('Sabueso nl 0.1.0 (core 0.1.0)\n');
  });
});
