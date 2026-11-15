// The `sabueso` program: the command registry of the core. Kept apart from cli.ts so
// tests can run it in memory, and apart from run.ts to avoid an import cycle with
// index.ts (which re-exports createCli and owns VERSION).
import { VERSION } from '../index.js';
import { demoGrammarCommand } from './commands/demo-grammar.js';
import { versionCommand } from './commands/version.js';
import { createCli } from './run.js';

export const runCli = createCli({
  program: 'sabueso',
  version: VERSION,
  commands: [versionCommand, demoGrammarCommand],
});
