/**
 * Concept: the LL(1) table M[A, a] of a grammar, its conflicts, and the verdict: with no
 * conflicts the grammar is LL(1), and therefore unambiguous.
 * Reference: Aho, Lam, Sethi and Ullman, Compilers (2nd ed.), 4.4.3.
 * Card: docs/concepts/06-predictive-table-and-unambiguity.md
 */
import {
  buildPredictiveTable,
  type PredictiveTable,
  type PredictiveTableConflict,
} from '../../analysis/predictive-table.js';
import { END_OF_INPUT } from '../../analysis/first-follow.js';
import { formatProduction } from '../../grammar/build.js';
import type { Grammar, Production } from '../../grammar/types.js';
import { parseArguments } from '../arguments.js';
import { formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const PREDICTIVE_TABLE_USAGE = `sabueso predictive-table ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path>`;

/** Marks a cell with more than one production. */
const CONFLICT_MARK = '✗';

export const predictiveTableCommand: Command = {
  name: 'predictive-table',
  description:
    'Build the LL(1) table M[A, a] and list its conflicts: none means LL(1), so unambiguous',
  usage: PREDICTIVE_TABLE_USAGE,
  async run(commandArguments, environment) {
    const parsed = parseArguments(commandArguments, {
      flags: [],
      valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION],
    });
    if (typeof parsed === 'string') {
      return reportUsageError(parsed, environment);
    }
    const source = resolveGrammarOption(parsed, PREDICTIVE_TABLE_USAGE);
    if (typeof source === 'string') {
      return reportUsageError(source, environment);
    }
    if (parsed.positionals.length > 0) {
      return reportUsageError(`Usage: ${PREDICTIVE_TABLE_USAGE}`, environment);
    }
    const grammar = await readGrammar(source, environment);
    const predictive = buildPredictiveTable({ grammar });
    const sections = [
      `${grammar.name}: LL(1) table M[A, a] (each cell: the numbers of its productions)`,
      formatPredictiveTable(grammar, predictive),
      formatProductionList(grammar.productions),
    ];
    if (!predictive.isPredictive) {
      sections.push(formatConflicts(predictive.conflicts));
    }
    sections.push(formatVerdict(predictive));
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return EXIT_CODES.ok;
  },
};

/** One row per nonterminal, one column per terminal (sorted) and $; conflicts marked with ✗. */
function formatPredictiveTable(grammar: Grammar, predictive: PredictiveTable): string {
  const columns = [...[...grammar.terminals].sort(), END_OF_INPUT];
  const rows = [...grammar.nonterminals].map((nonterminal) => [
    nonterminal,
    ...columns.map((lookahead) =>
      formatCell(predictive.table.get(nonterminal)?.get(lookahead) ?? []),
    ),
  ]);
  return formatTable(['M[A, a]', ...columns], rows);
}

/** '', '12', or '6 7 ✗' when the cell has more than one production. */
function formatCell(productions: readonly Production[]): string {
  const ids = productions.map((production) => String(production.id)).join(' ');
  return productions.length > 1 ? `${ids} ${CONFLICT_MARK}` : ids;
}

/** The numbered productions, so the numbers in the cells can be read. */
function formatProductionList(productions: readonly Production[]): string {
  const lines = productions.map(
    (production) => `  ${String(production.id).padStart(2)}  ${formatProduction(production)}`,
  );
  return ['Productions:', ...lines].join('\n');
}

/** One line per conflict: the cell and the productions that compete for it. */
function formatConflicts(conflicts: readonly PredictiveTableConflict[]): string {
  const lines = conflicts.map(
    (conflict) =>
      `  M[${conflict.nonterminal}, ${conflict.lookahead}]: ${conflict.productions
        .map(formatProduction)
        .join('  |  ')}`,
  );
  return [`Conflicts ${CONFLICT_MARK}:`, ...lines].join('\n');
}

function formatVerdict(predictive: PredictiveTable): string {
  return predictive.isPredictive
    ? 'LL(1): no cell has two productions, so the grammar is unambiguous'
    : `Not LL(1): ${predictive.conflicts.length} conflict(s). One token of lookahead is not enough to choose`;
}
