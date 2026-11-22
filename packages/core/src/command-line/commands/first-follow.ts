/**
 * Concept: FIRST and FOLLOW of each nonterminal and, with --steps, how both fixed points
 * grow round by round.
 * Guide: docs/guides/11-first-y-follow.md
 */
import { computeFirstFollow } from '../../analysis/first-follow.js';
import type { Grammar } from '../../grammar/types.js';
import { formatSet, formatSetsRounds, formatTable, type SetsSnapshot } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  readGrammarCommandArguments,
} from '../grammar-source.js';
import { EXIT_CODES, type Command } from '../types.js';

const STEPS_FLAG = '--steps';
const FIRST_FOLLOW_USAGE = `sabueso first-follow ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${STEPS_FLAG}]`;

/** The sets of every nonterminal after one round. */

export const firstFollowCommand: Command = {
  name: 'first-follow',
  description: 'Compute FIRST and FOLLOW of each nonterminal (--steps: each round)',
  usage: FIRST_FOLLOW_USAGE,
  async run({ commandArguments, environment }) {
    const input = readGrammarCommandArguments({
      commandArguments,
      rules: {
        flags: [STEPS_FLAG],
        valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION],
      },
      usage: FIRST_FOLLOW_USAGE,
      environment,
      allowsPositionals: false,
    });
    if (typeof input === 'number') {
      return input;
    }
    const { parsed, source } = input;
    const grammar = await readGrammar({ source, environment });
    const sets = computeFirstFollow(grammar);
    const sections = [`${grammar.name}: FIRST and FOLLOW`];
    if (parsed.flags.has(STEPS_FLAG)) {
      sections.push(
        formatSetsRounds({
          title: 'FIRST, round by round:',
          rounds: sets.firstRounds,
          start: new Map(),
        }),
      );
      sections.push(
        formatSetsRounds({
          title: 'FOLLOW, round by round (it starts with $ in FOLLOW of the start symbol):',
          rounds: sets.followRounds,
          start: new Map([[grammar.start, new Set(['$'])]]),
        }),
      );
    }
    sections.push(formatSetsTable({ grammar, first: sets.first, follow: sets.follow }));
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return EXIT_CODES.ok;
  },
};

/** One row per nonterminal, in the order of the grammar: its FIRST and its FOLLOW. */
function formatSetsTable({
  grammar,
  first,
  follow,
}: {
  grammar: Grammar;
  first: SetsSnapshot;
  follow: SetsSnapshot;
}): string {
  const rows = [...grammar.nonterminals].map((symbol) => [
    symbol,
    formatSet(first.get(symbol) ?? []),
    formatSet(follow.get(symbol) ?? []),
  ]);
  return formatTable({ header: ['Nonterminal', 'FIRST', 'FOLLOW'], rows });
}
