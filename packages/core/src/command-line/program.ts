// The `sabueso` program: the list of its commands. Kept apart from command-line.ts so
// tests can run it in memory, without starting a Node process.
import { demoGrammarCommand } from './commands/demo-grammar.js';
import { genresCommand } from './commands/genres.js';
import { grammarCommand } from './commands/grammar.js';
import { grammarsCommand } from './commands/grammars.js';
import { lexCommand } from './commands/lex.js';
import { formatGrammarGroups } from './grammars.js';
import { createCommandLineProgram } from './run.js';

export const runCommandLine = createCommandLineProgram({
  program: 'sabueso',
  commands: [genresCommand, grammarsCommand, grammarCommand, lexCommand, demoGrammarCommand],
  helpFooter: formatGrammarGroups(),
});
