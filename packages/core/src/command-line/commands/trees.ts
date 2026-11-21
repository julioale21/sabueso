/**
 * Concept: the parse trees of a story, rebuilt from the links of the Earley items and drawn
 * one by one. More than one tree means the grammar is ambiguous for that story.
 * Reference: Hopcroft 5.2; SPEC 02, sections 3.18 and 3.21.
 * Card: docs/concepts/18-backpointers-and-trees.md
 */
import { diagnose } from '../../earley/diagnostics.js';
import { recognize } from '../../earley/recognizer.js';
import { checkAlphabet, tokenizeSequence } from '../../input/sequence.js';
import { DEFAULT_TREE_LIMIT, parseTrees } from '../../trees/enumerate.js';
import { renderTree } from '../../trees/render.js';
import { parseArguments } from '../arguments.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const MAX_OPTION = '--max';
const TREES_USAGE = `sabueso trees ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${MAX_OPTION} <n>] "<story>"`;

export const treesCommand: Command = {
  name: 'trees',
  description: `Draw the parse trees of a story, numbered (--max: at most n, default ${DEFAULT_TREE_LIMIT})`,
  usage: TREES_USAGE,
  async run({ commandArguments, environment }) {
    const parsed = parseArguments({
      commandArguments,
      rules: {
        flags: [],
        valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION, MAX_OPTION],
      },
    });
    if (typeof parsed === 'string') {
      return reportUsageError({ message: parsed, environment });
    }
    const source = resolveGrammarOption({ parsed, usage: TREES_USAGE });
    if (typeof source === 'string') {
      return reportUsageError({ message: source, environment });
    }
    const limit = parseLimit(parsed.values.get(MAX_OPTION));
    if (limit === undefined) {
      return reportUsageError({
        message: `${MAX_OPTION} needs a whole number greater than 0`,
        environment,
      });
    }
    const grammar = await readGrammar({ source, environment });
    const tokens = tokenizeSequence(parsed.positionals.join(' '));
    const title = `${grammar.name}: trees of ${tokens.length === 0 ? '(empty input)' : tokens.join(' ')}`;
    if (checkAlphabet({ tokens, grammar }) !== null) {
      environment.writeOutput(
        `${title}\n\nREJECTED: a symbol is not in Σ, so there are no trees\n`,
      );
      return EXIT_CODES.rejected;
    }
    const recognition = recognize({ grammar, tokens });
    if (
      diagnose({ grammar, chart: recognition.chart, tokens, accepted: recognition.accepted }) !==
      null
    ) {
      environment.writeOutput(
        `${title}\n\nREJECTED: there are no trees (see \`sabueso earley\`)\n`,
      );
      return EXIT_CODES.rejected;
    }
    // One more than the limit, only to know whether the limit cut the list.
    const trees = parseTrees({ grammar, recognition, limit: limit + 1 });
    const shown = trees.slice(0, limit);
    const summary =
      trees.length > limit
        ? `The first ${limit} trees (there are more; \`sabueso count\` gives how many)`
        : `${shown.length} ${shown.length === 1 ? 'tree' : 'trees'}${shown.length > 1 ? ': the grammar is ambiguous for this input' : ''}`;
    const drawn = shown.map((tree, index) => `Tree ${index + 1}:\n${renderTree(tree)}`);
    environment.writeOutput(`${[title, summary, ...drawn].join('\n\n')}\n`);
    return EXIT_CODES.ok;
  },
};

/** The --max value as a positive whole number, the default if absent, or undefined if invalid. */
function parseLimit(value: string | undefined): number | undefined {
  if (value === undefined) {
    return DEFAULT_TREE_LIMIT;
  }
  const limit = Number(value);
  return Number.isInteger(limit) && limit > 0 ? limit : undefined;
}
