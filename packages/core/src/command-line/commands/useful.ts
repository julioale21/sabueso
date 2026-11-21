/**
 * Concept: productive, reachable and useless symbols, and whether L(G) = ∅. With --steps,
 * the rounds of both fixed points; at the end, the grammar without useless symbols.
 * Reference: Hopcroft 7.1.1, 7.1.2 and 7.4.3.
 * Card: docs/concepts/08-useless-symbols-and-emptiness.md
 */
import {
  analyzeUsefulSymbols,
  type UsefulPhase,
  type UsefulSymbolsAnalysis,
} from '../../analysis/useful.js';
import type { Grammar, SymbolName } from '../../grammar/types.js';
import { parseArguments } from '../arguments.js';
import { formatGrammar, formatSet, formatTable } from '../format.js';
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
  async run(commandArguments, environment) {
    const parsed = parseArguments(commandArguments, {
      flags: [STEPS_FLAG],
      valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION],
    });
    if (typeof parsed === 'string') {
      return reportUsageError(parsed, environment);
    }
    const source = resolveGrammarOption(parsed, USEFUL_USAGE);
    if (typeof source === 'string') {
      return reportUsageError(source, environment);
    }
    if (parsed.positionals.length > 0) {
      return reportUsageError(`Usage: ${USEFUL_USAGE}`, environment);
    }
    const grammar = await readGrammar(source, environment);
    const rounds: Record<UsefulPhase, ReadonlySet<SymbolName>[]> = {
      productive: [],
      reachable: [],
    };
    const analysis = analyzeUsefulSymbols({
      grammar,
      onRound: ({ phase, symbolsSoFar }) => rounds[phase].push(symbolsSoFar),
    });
    const sections = [`${grammar.name}: useful symbols`];
    if (parsed.flags.has(STEPS_FLAG)) {
      sections.push(
        formatRounds('Productive (A ⇒* w, w ∈ Σ*), round by round:', rounds.productive, []),
      );
      if (!analysis.isEmpty) {
        sections.push(
          formatRounds('Reachable from the start symbol, round by round:', rounds.reachable, [
            grammar.start,
          ]),
        );
      }
    }
    sections.push(formatSummary(grammar, analysis));
    if (analysis.usefulGrammar !== null && analysis.useless.size > 0) {
      sections.push(`Without useless symbols:\n\n${formatGrammar(analysis.usefulGrammar)}`);
    }
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return EXIT_CODES.ok;
  },
};

/** The non-productive, unreachable and useless symbols, and whether L(G) = ∅. */
function formatSummary(grammar: Grammar, analysis: UsefulSymbolsAnalysis): string {
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

/**
 * One row per round: how many symbols so far and which ones it added. A phase that does not
 * start from ∅ (reachable starts from {S}) shows its starting set as round 0.
 */
function formatRounds(
  title: string,
  rounds: readonly ReadonlySet<SymbolName>[],
  initial: readonly SymbolName[],
): string {
  const start = new Set(initial);
  const startRow =
    initial.length === 0 ? [] : [['0', String(start.size), `${initial.join(', ')} (start)`]];
  const rows = rounds.map((round, index) => {
    const previous = rounds[index - 1] ?? start;
    const added = [...round].filter((symbol) => !previous.has(symbol));
    return [
      String(index + 1),
      String(round.size),
      added.length === 0 ? '(none: fixed point)' : added.sort().join(', '),
    ];
  });
  return `${title}\n\n${formatTable(['Round', 'Symbols so far', 'Added in this round'], [...startRow, ...rows])}`;
}

/** '∅' for no symbols, as in the theory; '{A, B}' otherwise. */
function formatSymbols(symbols: readonly SymbolName[]): string {
  return symbols.length === 0 ? '∅' : formatSet(symbols);
}
