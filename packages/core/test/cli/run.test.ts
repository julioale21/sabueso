import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/program.js';
import { createCli, set, table } from '../../src/index.js';
import { memoryIo } from './memory-io.js';

describe('sabueso CLI', () => {
  it('version prints the core version and exits with 0', async () => {
    const { io, stdout, stderr } = memoryIo();
    expect(await runCli(['version'], io)).toBe(0);
    expect(stdout()).toBe('Sabueso core 0.1.0\n');
    expect(stderr()).toBe('');
  });

  it('help lists version and help', async () => {
    const { io, stdout } = memoryIo();
    expect(await runCli(['help'], io)).toBe(0);
    expect(stdout()).toMatch(/^version\s/m);
    expect(stdout()).toMatch(/^help\s/m);
  });

  it('shows the help when called without arguments', async () => {
    const withoutArgs = memoryIo();
    const withHelp = memoryIo();
    expect(await runCli([], withoutArgs.io)).toBe(0);
    await runCli(['help'], withHelp.io);
    expect(withoutArgs.stdout()).toBe(withHelp.stdout());
  });

  it('an unknown command writes to stderr, lists the commands and exits with 2', async () => {
    const { io, stdout, stderr } = memoryIo();
    expect(await runCli(['foo'], io)).toBe(2);
    expect(stdout()).toBe('');
    expect(stderr()).toContain('Unknown command: foo');
    expect(stderr()).toMatch(/^version\s/m);
  });
});

describe('createCli', () => {
  it('reports a failing command on stderr and exits with 1', async () => {
    const run = createCli({
      program: 'test',
      version: '0.0.0',
      commands: [
        {
          name: 'boom',
          description: 'Always fails',
          usage: 'test boom',
          run: () => Promise.reject(new Error('it broke')),
        },
      ],
    });
    const { io, stderr } = memoryIo();
    expect(await run(['boom'], io)).toBe(1);
    expect(stderr()).toBe('Error: it broke\n');
  });
});

describe('format', () => {
  it('table aligns the columns', () => {
    expect(
      table(
        ['Symbol', 'Kind'],
        [
          ['S', 'nonterminal'],
          ['CRI', 'terminal'],
        ],
      ),
    ).toBe(
      ['Symbol  Kind', '------  -----------', 'S       nonterminal', 'CRI     terminal'].join('\n'),
    );
  });

  it('set sorts and removes duplicates', () => {
    expect(set(['c', 'a', 'b', 'a'])).toBe('{a, b, c}');
    expect(set([])).toBe('{}');
  });
});
