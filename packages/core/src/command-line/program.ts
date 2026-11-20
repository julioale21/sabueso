// The `sabueso` program: the list of its commands. Kept apart from command-line.ts so
// tests can run it in memory, without starting a Node process.
import { demoGrammarCommand } from './commands/demo-grammar.js';
import { lexCommand } from './commands/lex.js';
import { createCommandLineProgram } from './run.js';

export const runCommandLine = createCommandLineProgram({
  program: 'sabueso',
  commands: [demoGrammarCommand, lexCommand],
});
