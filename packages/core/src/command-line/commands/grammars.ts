/**
 * Concept: every built-in grammar, read with the whole chain (lexer → parser → buildGrammar)
 * and summarized by the sizes of its 4-tuple: |N|, |Σ| and |P|.
 * Reference: SPEC 02, sections 4 and 8.2.
 */
import { parseGrammarText } from '../../grammar-format/parser.js';
import type { Grammar } from '../../grammar/types.js';
import { formatTable } from '../format.js';
import {
  builtInGrammarPath,
  grammarGroups,
  listBuiltInGrammars,
  type BuiltInGrammar,
  type GrammarGroup,
} from '../built-in-grammars.js';
import {
  EXIT_CODES,
  reportUsageError,
  type Command,
  type CommandLineEnvironment,
} from '../types.js';

export const grammarsCommand: Command = {
  name: 'grammars',
  description: 'List the built-in grammars with their sizes |N|, |Σ| and |P|',
  usage: 'sabueso grammars',
  async run(commandArguments, environment) {
    if (commandArguments.length > 0) {
      return reportUsageError('Usage: sabueso grammars', environment);
    }
    const rows = await Promise.all(
      listBuiltInGrammars().map((grammar) => describeGrammar(grammar, environment)),
    );
    const sections = grammarGroups.map((group) => formatGroup(group, rows));
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return EXIT_CODES.ok;
  },
};

/** A built-in grammar, read and built, to show its sizes. */
interface GrammarRow {
  builtIn: BuiltInGrammar;
  grammar: Grammar;
}

/** Reads and builds one built-in grammar, to show its sizes. */
async function describeGrammar(
  builtIn: BuiltInGrammar,
  environment: CommandLineEnvironment,
): Promise<GrammarRow> {
  const text = await environment.readFile(builtInGrammarPath(builtIn));
  return { builtIn, grammar: parseGrammarText({ text, name: builtIn.id }) };
}

/** The table of one group of grammars: id, aliases, |N|, |Σ|, |P| and description. */
function formatGroup(group: GrammarGroup, rows: readonly GrammarRow[]): string {
  const groupRows = rows.filter((row) => row.builtIn.group === group);
  return [
    `${group}:`,
    '',
    formatTable(
      ['Grammar', 'Aliases', '|N|', '|Σ|', '|P|', 'Description'],
      groupRows.map(({ builtIn, grammar }) => [
        builtIn.id,
        builtIn.aliases.join(', '),
        String(grammar.nonterminals.size),
        String(grammar.terminals.size),
        String(grammar.productions.length),
        builtIn.description,
      ]),
    ),
  ].join('\n');
}
