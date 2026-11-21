/**
 * Concept: the nullable symbols of a grammar (A ⇒* ε) and, with --steps, how the fixed
 * point grows round by round until it stops changing.
 * Card: docs/concepts/07-nullable-symbols.md
 */
import { lastRound } from '../../analysis/fixed-point.js';
import { nullableRounds } from '../../analysis/nullable.js';
import type { Grammar, SymbolName } from '../../grammar/types.js';
import { parseArguments } from '../arguments.js';
import { formatSet, formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const STEPS_FLAG = '--steps';
const NULLABLE_USAGE = `sabueso nullable ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${STEPS_FLAG}]`;

export const nullableCommand: Command = {
  name: 'nullable',
  description: 'Compute the nullable symbols, A ⇒* ε (--steps: each round of the fixed point)',
  usage: NULLABLE_USAGE,
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
    const source = resolveGrammarOption({ parsed, usage: NULLABLE_USAGE });
    if (typeof source === 'string') {
      return reportUsageError({ message: source, environment });
    }
    if (parsed.positionals.length > 0) {
      return reportUsageError({ message: `Usage: ${NULLABLE_USAGE}`, environment });
    }
    const grammar = await readGrammar({ source, environment });
    const rounds = nullableRounds(grammar);
    const nullableSymbols = lastRound(rounds);
    const sections = [`${grammar.name}: nullable symbols (A ⇒* ε)`];
    if (parsed.flags.has(STEPS_FLAG)) {
      sections.push(formatRounds(rounds));
    }
    sections.push(formatResult({ grammar, nullableSymbols }));
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return EXIT_CODES.ok;
  },
};

/** One row per round: what it added and how many are known so far. The last adds nothing. */
function formatRounds(rounds: readonly ReadonlySet<SymbolName>[]): string {
  const rows = rounds.map((round, index) => {
    const previous = rounds[index - 1] ?? new Set<SymbolName>();
    const added = [...round].filter((symbol) => !previous.has(symbol));
    return [
      String(index + 1),
      String(round.size),
      added.length === 0 ? '(none: fixed point)' : added.sort().join(', '),
    ];
  });
  return formatTable({ header: ['Round', 'Nullable so far', 'Added in this round'], rows });
}

/** The closing line: the nullable set and how many of the nonterminals it covers. */
function formatResult({
  grammar,
  nullableSymbols,
}: {
  grammar: Grammar;
  nullableSymbols: ReadonlySet<SymbolName>;
}): string {
  return `Nullable = ${formatNullableSet(nullableSymbols)} (${nullableSymbols.size} of ${grammar.nonterminals.size} nonterminals)`;
}

/** '∅' for the empty set, as in the theory; '{A, B}' otherwise. */
function formatNullableSet(symbols: ReadonlySet<SymbolName>): string {
  return symbols.size === 0 ? '∅' : formatSet(symbols);
}
