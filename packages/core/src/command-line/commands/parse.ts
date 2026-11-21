/**
 * Concept: the full analysis of a story in one command, through the public parse():
 * accepted or rejected (with the diagnosis and the Earley items left open), how many trees, the first trees drawn, and the
 * leftmost derivation of the first one. With --trace, every step of Earley.
 */
import { parse, type ParseResult } from '../../parse.js';
import { renderDerivation } from '../../trees/derivation.js';
import { renderTree } from '../../trees/render.js';
import type { TreeCount } from '../../trees/tree.js';
import { formatOpenItems, formatRejection } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  readGrammarCommandArguments,
} from '../grammar-source.js';
import { FILE_OPTION, readStory } from '../story-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const TREES_OPTION = '--trees';
const TRACE_FLAG = '--trace';
const PARSE_USAGE = `sabueso parse ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${TREES_OPTION} <n>] [${TRACE_FLAG}] "<story>" | ${FILE_OPTION} <path>`;

export const parseCommand: Command = {
  name: 'parse',
  description: 'Analyze a story in full: verdict, diagnosis, tree count, trees and derivation',
  usage: PARSE_USAGE,
  async run({ commandArguments, environment }) {
    const input = readGrammarCommandArguments({
      commandArguments,
      rules: {
        flags: [TRACE_FLAG],
        valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION, TREES_OPTION, FILE_OPTION],
      },
      usage: PARSE_USAGE,
      environment,
    });
    if (typeof input === 'number') {
      return input;
    }
    const { parsed, source } = input;
    const treesToShow = Number(parsed.values.get(TREES_OPTION) ?? '1');
    if (!Number.isInteger(treesToShow) || treesToShow < 1) {
      return reportUsageError({
        message: `${TREES_OPTION} needs a whole number greater than 0`,
        environment,
      });
    }
    const story = await readStory({ parsed, environment });
    if (typeof story === 'string') {
      return reportUsageError({ message: story, environment });
    }
    const grammar = await readGrammar({ source, environment });
    const result = parse({
      grammar,
      input: story.tokens,
      options: {
        maxTrees: treesToShow,
        trace: parsed.flags.has(TRACE_FLAG),
      },
    });
    const sections = [`${grammar.name}: ${story.label}`, ...formatResult(result)];
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return result.accepted ? EXIT_CODES.ok : EXIT_CODES.rejected;
  },
};

/** The sections of the report: the verdict and, if accepted, the trees and the derivation. */
function formatResult(result: ParseResult): string[] {
  const trace = result.trace.length === 0 ? [] : [formatTrace(result)];
  if (!result.accepted) {
    const renderRejection = formatRejection as (error: unknown) => string;
    const openItems = result.openItems === null ? [] : [formatOpenItems(result.openItems)];
    return [renderRejection(result.error), ...openItems, ...trace];
  }
  const trees = result.trees.map((tree, index) => `Tree ${index + 1}:\n${renderTree(tree)}`);
  const renderLeftmostDerivation = renderDerivation as (derivation: unknown) => string;
  return [
    'ACCEPTED: the input is a sentence of L(G)',
    formatCount(result.treeCount),
    ...trees,
    `Leftmost derivation of tree 1:\n${renderLeftmostDerivation(result.derivation)}`,
    ...trace,
  ];
}

/** 'Trees: 4 (ambiguous)', 'Trees: 1', or infinitely many. */
function formatCount(count: TreeCount | null): string {
  if (count === null) {
    return 'Trees: not counted';
  }
  if (count === 'infinite') {
    return 'Trees: infinitely many (the grammar has a cycle)';
  }
  return `Trees: ${count}${count > 1n ? ' (ambiguous for this input)' : ''}`;
}

/** The numbered events of Earley, one per line. */
function formatTrace(result: ParseResult): string {
  const lines = result.trace.map(
    (event, index) =>
      `#${index + 1} S${event.set} ${event.op.toUpperCase()} ${event.item} ← ${event.cause}${event.isNew ? '' : ' (again)'}`,
  );
  return `Trace (${result.trace.length} events):\n${lines.join('\n')}`;
}
