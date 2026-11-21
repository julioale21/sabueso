/**
 * Concept: FIRST and FOLLOW of each nonterminal and, with --steps, how both fixed points
 * grow round by round.
 * Reference: Aho, Lam, Sethi and Ullman, Compilers (2nd ed.), 4.4.2.
 * Card: docs/concepts/05-first-follow.md
 */
import { computeFirstFollow, type FirstFollowPhase } from '../../analysis/first-follow.js';
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
const FIRST_FOLLOW_USAGE = `sabueso first-follow ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${STEPS_FLAG}]`;

/** The sets of every nonterminal after one round. */
type Snapshot = ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>;

export const firstFollowCommand: Command = {
  name: 'first-follow',
  description: 'Compute FIRST and FOLLOW of each nonterminal (--steps: each round)',
  usage: FIRST_FOLLOW_USAGE,
  async run(commandArguments, environment) {
    const parsed = parseArguments(commandArguments, {
      flags: [STEPS_FLAG],
      valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION],
    });
    if (typeof parsed === 'string') {
      return reportUsageError(parsed, environment);
    }
    const source = resolveGrammarOption(parsed, FIRST_FOLLOW_USAGE);
    if (typeof source === 'string') {
      return reportUsageError(source, environment);
    }
    if (parsed.positionals.length > 0) {
      return reportUsageError(`Usage: ${FIRST_FOLLOW_USAGE}`, environment);
    }
    const grammar = await readGrammar(source, environment);
    const rounds: Record<FirstFollowPhase, Snapshot[]> = { first: [], follow: [] };
    const sets = computeFirstFollow({
      grammar,
      onRound: ({ phase, setsSoFar }) => rounds[phase].push(setsSoFar),
    });
    const sections = [`${grammar.name}: FIRST and FOLLOW`];
    if (parsed.flags.has(STEPS_FLAG)) {
      sections.push(formatRounds('FIRST, round by round:', rounds.first, new Map()));
      sections.push(
        formatRounds(
          'FOLLOW, round by round (it starts with $ in FOLLOW of the start symbol):',
          rounds.follow,
          new Map([[grammar.start, new Set(['$'])]]),
        ),
      );
    }
    sections.push(formatSetsTable(grammar, sets.first, sets.follow));
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return EXIT_CODES.ok;
  },
};

/** One row per nonterminal, in the order of the grammar: its FIRST and its FOLLOW. */
function formatSetsTable(grammar: Grammar, first: Snapshot, follow: Snapshot): string {
  const rows = [...grammar.nonterminals].map((symbol) => [
    symbol,
    formatSet(first.get(symbol) ?? []),
    formatSet(follow.get(symbol) ?? []),
  ]);
  return formatTable(['Nonterminal', 'FIRST', 'FOLLOW'], rows);
}

/** One row per round with what it added to each set; the last round adds nothing. */
function formatRounds(title: string, rounds: readonly Snapshot[], start: Snapshot): string {
  const rows = rounds.map((round, index) => [
    String(index + 1),
    describeAdditions(rounds[index - 1] ?? start, round),
  ]);
  return `${title}\n\n${formatTable(['Round', 'Added in this round'], rows)}`;
}

/** 'Pista += {INT, PIS}; Inicio += {CRI, HAL}', or the fixed point if nothing was added. */
function describeAdditions(before: Snapshot, after: Snapshot): string {
  const changes = [...after]
    .map(([symbol, members]) => ({
      symbol,
      added: [...members].filter((member) => !(before.get(symbol)?.has(member) ?? false)),
    }))
    .filter((change) => change.added.length > 0)
    .map((change) => `${change.symbol} += ${formatSet(change.added)}`);
  return changes.length === 0 ? '(none: fixed point)' : changes.join('; ');
}
