/**
 * Concept: the full report of a grammar, steps 7 to 12 together: nullable symbols, minimum
 * yield, useless symbols and emptiness, cycles and LL(1).
 * Reference: SPEC 02, sections 3.5 to 3.10.
 */
import { analyzeGrammar, type GrammarAnalysis } from '../../analysis/index.js';
import type { Grammar, SymbolName } from '../../grammar/types.js';
import { parseArguments } from '../arguments.js';
import { formatCycle, formatSet, formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const ANALYZE_USAGE = `sabueso analyze ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path>`;

export const analyzeCommand: Command = {
  name: 'analyze',
  description: 'Report every analysis of the grammar: nullable, minYield, useless, cycles, LL(1)',
  usage: ANALYZE_USAGE,
  async run(commandArguments, environment) {
    const parsed = parseArguments(commandArguments, {
      flags: [],
      valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION],
    });
    if (typeof parsed === 'string') {
      return reportUsageError(parsed, environment);
    }
    const source = resolveGrammarOption(parsed, ANALYZE_USAGE);
    if (typeof source === 'string') {
      return reportUsageError(source, environment);
    }
    if (parsed.positionals.length > 0) {
      return reportUsageError(`Usage: ${ANALYZE_USAGE}`, environment);
    }
    const grammar = await readGrammar(source, environment);
    const report = formatReport(grammar, analyzeGrammar(grammar));
    environment.writeOutput(`${grammar.name}: analysis\n\n${report}\n`);
    return EXIT_CODES.ok;
  },
};

/** One row per analysis: what it found, and the step and command that explain it. */
function formatReport(grammar: Grammar, analysis: GrammarAnalysis): string {
  const shortest = analysis.minYield.get(grammar.start) ?? Infinity;
  const { conflicts, isPredictive } = analysis.predictiveTable;
  const rows = [
    [
      'Size',
      `|N| = ${grammar.nonterminals.size}, |Σ| = ${grammar.terminals.size}, |P| = ${grammar.productions.length}`,
      'grammars',
    ],
    ['Nullable (A ⇒* ε)', formatSymbols(analysis.nullable), 'nullable'],
    ['Shortest sentence', shortest === Infinity ? 'none' : `length ${shortest}`, 'min-yield'],
    ['Useless symbols', formatSymbols(analysis.useless), 'useful'],
    ['L(G) = ∅', analysis.isEmpty ? 'yes' : 'no', 'useful'],
    [
      'Cycles (A ⇒+ A)',
      analysis.cycles.length === 0 ? 'none' : analysis.cycles.map(formatCycle).join('; '),
      'cycles',
    ],
    [
      'LL(1)',
      isPredictive ? 'yes: 0 conflicts, so unambiguous' : `no: ${conflicts.length} conflict(s)`,
      'predictive-table',
    ],
  ];
  return formatTable(['Analysis', 'Result', 'Details'], rows);
}

/** '∅' for no symbols, as in the theory; '{A, B}' otherwise. */
function formatSymbols(symbols: ReadonlySet<SymbolName>): string {
  return symbols.size === 0 ? '∅' : formatSet(symbols);
}
