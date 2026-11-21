/**
 * Concept: productive, reachable and useless symbols, and whether L(G) = ∅. With --steps,
 * the rounds of both fixed points; at the end, the grammar without useless symbols.
 * Card: docs/concepts/08-useless-symbols-and-emptiness.md
 */
import { analyzeUsefulSymbols, type UsefulSymbolsAnalysis } from '../../analysis/useful.js';
import type { Grammar, SymbolName } from '../../grammar/types.js';
import { parseArguments } from '../arguments.js';
import { formatGrammar, formatSet, formatSymbolRounds } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const STEPS_FLAG = '--steps';
const USEFUL_USAGE = `sabueso useful ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${STEPS_FLAG}]`;

export const usefulCommand: Command = {
  name: 'useful',
  description:
    'Find the productive, reachable and useless symbols, and whether L(G) = ∅ (--steps: each round)',
  usage: USEFUL_USAGE,
  async run({ commandArguments, environment }) {
    const parsed = parseArguments({
      commandArguments,
      rules: {
        flags: [STEPS_FLAG],
        valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION],
      },
    });
    if (typeof parsed === 'string') {
      return reportUsageError({ message: parsed, environment });
    }
    const source = resolveGrammarOption({ parsed, usage: USEFUL_USAGE });
    if (typeof source === 'string') {
      return reportUsageError({ message: source, environment });
    }
    if (parsed.positionals.length > 0) {
      return reportUsageError({ message: `Usage: ${USEFUL_USAGE}`, environment });
    }
    const grammar = await readGrammar({ source, environment });
    const analysis = analyzeUsefulSymbols(grammar);
    const sections = [`${grammar.name}: useful symbols`];
    if (parsed.flags.has(STEPS_FLAG)) {
      sections.push(
        formatSymbolRounds({
          column: 'Symbols so far',
          title: 'Productive (A ⇒* w, w ∈ Σ*), round by round:',
          rounds: analysis.productiveRounds,
          initial: [],
        }),
      );
      if (!analysis.isEmpty) {
        sections.push(
          formatSymbolRounds({
            column: 'Symbols so far',
            title: 'Reachable from the start symbol, round by round:',
            rounds: analysis.reachableRounds,
            initial: [grammar.start],
          }),
        );
      }
    }
    sections.push(formatSummary({ grammar, analysis }));
    if (analysis.usefulGrammar !== null && analysis.useless.size > 0) {
      sections.push(`Without useless symbols:\n\n${formatGrammar(analysis.usefulGrammar)}`);
    }
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return EXIT_CODES.ok;
  },
};

/** The non-productive, unreachable and useless symbols, and whether L(G) = ∅. */
function formatSummary({
  grammar,
  analysis,
}: {
  grammar: Grammar;
  analysis: UsefulSymbolsAnalysis;
}): string {
  const notProductive = [...grammar.nonterminals].filter(
    (symbol) => !analysis.productive.has(symbol),
  );
  if (analysis.isEmpty) {
    return [
      `Not productive: ${formatSymbols(notProductive)}`,
      `L(G) = ∅: the start symbol ${grammar.start} is not productive, so the grammar generates no sentence`,
    ].join('\n');
  }
  const notReachable = [...grammar.nonterminals].filter(
    (symbol) => analysis.productive.has(symbol) && !analysis.reachable.has(symbol),
  );
  return [
    `Not productive: ${formatSymbols(notProductive)}`,
    `Not reachable (once those are removed): ${formatSymbols(notReachable)}`,
    analysis.useless.size === 0
      ? 'Useless: ∅. Every symbol takes part in some sentence of L(G)'
      : `Useless: ${formatSymbols([...analysis.useless])}`,
    'L(G) ≠ ∅',
  ].join('\n');
}

/** '∅' for no symbols, as in the theory; '{A, B}' otherwise. */
function formatSymbols(symbols: readonly SymbolName[]): string {
  return symbols.length === 0 ? '∅' : formatSet(symbols);
}
