/**
 * Concept: every built-in grammar, read with the whole chain (lexer → parser → buildGrammar)
 * and summarized by the sizes of its 4-tuple: |N|, |Σ| and |P|.
 * Reference: SPEC 02, sections 4 and 8.2.
 */
import { parseGrammarText } from '../../grammar-format/parser.js';
import type { Grammar } from '../../grammar/types.js';
import { table } from '../format.js';
import {
  builtInGrammarPath,
  listBuiltInGrammars,
  type BuiltInGrammar,
  type GrammarGroup,
} from '../grammars.js';
import { EXIT_CODES, type Command, type CommandLineEnvironment } from '../types.js';

const GROUPS: readonly GrammarGroup[] = ['Géneros', 'Desarrollo'];

export const grammarsCommand: Command = {
  name: 'grammars',
  description: 'List the built-in grammars with their sizes |N|, |Σ| and |P|',
  usage: 'sabueso grammars',
  async run(commandArguments, environment) {
    if (commandArguments.length > 0) {
      environment.writeError('Usage: sabueso grammars\n');
      return EXIT_CODES.usage;
    }
    const rows = await Promise.all(
      listBuiltInGrammars().map((grammar) => describeGrammar(grammar, environment)),
    );
    const sections = GROUPS.map((group) => formatGroup(group, rows));
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return EXIT_CODES.ok;
  },
};

/** A built-in grammar, read and built, to show its sizes. */
interface GrammarRow {
  builtIn: BuiltInGrammar;
  grammar: Grammar;
}

async function describeGrammar(
  builtIn: BuiltInGrammar,
  environment: CommandLineEnvironment,
): Promise<GrammarRow> {
  const text = await environment.readFile(builtInGrammarPath(builtIn));
  return { builtIn, grammar: parseGrammarText(text, builtIn.id) };
}

function formatGroup(group: GrammarGroup, rows: readonly GrammarRow[]): string {
  const groupRows = rows.filter((row) => row.builtIn.group === group);
  return [
    `${group}:`,
    '',
    table(
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
