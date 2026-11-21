// Keeps docs/console-demo.md honest: every `npm run sabueso -- …` line in its code blocks
// must be a valid invocation (exit code other than 2).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runCommandLine } from '../../src/command-line/program.js';
import { EXIT_CODES } from '../../src/command-line/types.js';
import { createMemoryEnvironment } from './memory-environment.js';

const DEMO_PATH = new URL('../../../../docs/console-demo.md', import.meta.url);
const COMMAND_PREFIX = 'npm run sabueso -- ';

/** Returns the `npm run sabueso -- …` lines found inside fenced code blocks. */
function demoCommands(markdown: string): string[] {
  const commands: string[] = [];
  let insideCodeBlock = false;
  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('```')) {
      insideCodeBlock = !insideCodeBlock;
    } else if (insideCodeBlock && line.startsWith(COMMAND_PREFIX)) {
      commands.push(line);
    }
  }
  return commands;
}

/** Splits the arguments after the prefix, keeping quoted arguments together. */
function parseArguments(command: string): string[] {
  const rest = command.slice(COMMAND_PREFIX.length);
  return (rest.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((arg) =>
    arg.replace(/^(["'])(.*)\1$/, '$2'),
  );
}

const commands = demoCommands(readFileSync(DEMO_PATH, 'utf8'));

describe('docs/console-demo.md', () => {
  it('contains at least one sabueso command', () => {
    expect(commands.length).toBeGreaterThan(0);
  });

  it.each(commands)('%s is a valid invocation', async (command) => {
    const { environment, errors } = createMemoryEnvironment();
    const exitCode = await runCommandLine({
      commandLineArguments: parseArguments(command),
      environment,
    });
    expect(exitCode, errors()).not.toBe(EXIT_CODES.usage);
  });
});
