// The `sabueso` program: the list of its commands. Kept apart from command-line.ts so
// tests can run it in memory, without starting a Node process.
import { ambiguityCommand } from './commands/ambiguity.js';
import { analyzeCommand } from './commands/analyze.js';
import { benchCommand } from './commands/bench.js';
import { chomskyNormalFormCommand } from './commands/chomsky-normal-form.js';
import { cockeYoungerKasamiCommand } from './commands/cocke-younger-kasami.js';
import { compareCommand } from './commands/compare.js';
import { countCommand } from './commands/count.js';
import { cyclesCommand } from './commands/cycles.js';
import { deriveCommand } from './commands/derive.js';
import { differentialCommand } from './commands/differential.js';
import { earleyCommand } from './commands/earley.js';
import { epsilonTreesCommand } from './commands/epsilon-trees.js';
import { firstFollowCommand } from './commands/first-follow.js';
import { generateCommand } from './commands/generate.js';
import { genresCommand } from './commands/genres.js';
import { grammarCommand } from './commands/grammar.js';
import { grammarsCommand } from './commands/grammars.js';
import { itemsCommand } from './commands/items.js';
import { lexCommand } from './commands/lex.js';
import { minYieldCommand } from './commands/min-yield.js';
import { nullableCommand } from './commands/nullable.js';
import { parseCommand } from './commands/parse.js';
import { predictiveTableCommand } from './commands/predictive-table.js';
import { pushdownAutomatonCommand } from './commands/pushdown-automaton.js';
import { tokensCommand } from './commands/tokens.js';
import { traceCommand } from './commands/trace.js';
import { treesCommand } from './commands/trees.js';
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
    predictiveTableCommand,
    analyzeCommand,
    itemsCommand,
    earleyCommand,
    traceCommand,
    epsilonTreesCommand,
    treesCommand,
    countCommand,
    deriveCommand,
    parseCommand,
    chomskyNormalFormCommand,
    cockeYoungerKasamiCommand,
    pushdownAutomatonCommand,
    generateCommand,
    ambiguityCommand,
    compareCommand,
    differentialCommand,
    benchCommand,
    lexCommand,
  ],
  helpFooter: formatGrammarGroups(),
});
