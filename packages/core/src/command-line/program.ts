// The `sabueso` program: the list of its commands. Kept apart from command-line.ts so
// tests can run it in memory, without starting a Node process.
import { cyclesCommand } from './commands/cycles.js';
import { firstFollowCommand } from './commands/first-follow.js';
import { genresCommand } from './commands/genres.js';
import { grammarCommand } from './commands/grammar.js';
import { grammarsCommand } from './commands/grammars.js';
import { lexCommand } from './commands/lex.js';
import { minYieldCommand } from './commands/min-yield.js';
import { nullableCommand } from './commands/nullable.js';
import { tokensCommand } from './commands/tokens.js';
import { usefulCommand } from './commands/useful.js';
import { formatGrammarGroups } from './built-in-grammars.js';
import { createCommandLineProgram } from './run.js';

export const runCommandLine = createCommandLineProgram({
  program: 'sabueso',
  commands: [
    genresCommand,
    grammarsCommand,
    grammarCommand,
    tokensCommand,
    nullableCommand,
    minYieldCommand,
    usefulCommand,
    cyclesCommand,
    firstFollowCommand,
    lexCommand,
  ],
  helpFooter: formatGrammarGroups(),
});
