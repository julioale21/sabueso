/**
 * Concept: the cycles A ⇒+ A of a grammar, which give some string infinitely many trees,
 * and the unit graph where they are found.
 * Reference: SPEC 02, section 3.9.
 * Card: docs/concepts/09-cycles.md
 */
import { computeNullable } from '../../analysis/nullable.js';
import { buildUnitGraph, findCycles, type UnitGraph } from '../../analysis/cycles.js';
import type { SymbolName } from '../../grammar/types.js';
import { parseArguments } from '../arguments.js';
import { formatCycle, formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const GRAPH_FLAG = '--graph';
const CYCLES_USAGE = `sabueso cycles ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${GRAPH_FLAG}]`;

export const cyclesCommand: Command = {
  name: 'cycles',
  description: 'Find the cycles A ⇒+ A, which give infinitely many trees (--graph: the unit graph)',
  usage: CYCLES_USAGE,
  async run(commandArguments, environment) {
    const parsed = parseArguments(commandArguments, {
      flags: [GRAPH_FLAG],
      valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION],
    });
    if (typeof parsed === 'string') {
      return reportUsageError(parsed, environment);
    }
    const source = resolveGrammarOption(parsed, CYCLES_USAGE);
    if (typeof source === 'string') {
      return reportUsageError(source, environment);
    }
    if (parsed.positionals.length > 0) {
      return reportUsageError(`Usage: ${CYCLES_USAGE}`, environment);
    }
    const grammar = await readGrammar(source, environment);
    const sections = [`${grammar.name}: cycles A ⇒+ A`];
    if (parsed.flags.has(GRAPH_FLAG)) {
      sections.push(
        formatUnitGraph(buildUnitGraph({ grammar, nullable: computeNullable({ grammar }) })),
      );
    }
    sections.push(formatCycles(findCycles(grammar)));
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return EXIT_CODES.ok;
  },
};

/** One row per nonterminal with the symbols it can turn into without producing anything else. */
function formatUnitGraph(graph: UnitGraph): string {
  const rows = [...graph].map(([symbol, targets]) => [
    symbol,
    targets.length === 0 ? '—' : targets.join(', '),
  ]);
  return `Unit graph (A → B when A → α B β with α and β nullable):\n\n${formatTable(['From', 'To'], rows)}`;
}

/** The cycles found, one per line, or a line saying there are none. */
function formatCycles(cycles: readonly SymbolName[][]): string {
  if (cycles.length === 0) {
    return 'No cycles: every string has finitely many trees';
  }
  return [
    `${cycles.length} cycle(s): some string has infinitely many trees`,
    ...cycles.map((cycle) => `  ${formatCycle(cycle)}`),
  ].join('\n');
}
