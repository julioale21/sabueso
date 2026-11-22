/**
 * Concept: the parse trees of a story, rebuilt from the links of the Earley items and drawn
 * one by one. More than one tree means the grammar is ambiguous for that story.
 * Guide: docs/guides/19-arboles-de-un-relato.md
 */
import { diagnose } from '../../earley/diagnostics.js';
import { recognize } from '../../earley/recognizer.js';
import { checkAlphabet, tokenizeSequence } from '../../input/sequence.js';
import { countTrees } from '../../trees/count.js';
import { DEFAULT_TREE_LIMIT, parseTrees } from '../../trees/enumerate.js';
import { renderTree } from '../../trees/render.js';
import type { TreeCount } from '../../trees/tree.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  readGrammarCommandArguments,
} from '../grammar-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const MAX_OPTION = '--max';
const TREES_USAGE = `sabueso trees ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${MAX_OPTION} <n>] "<story>"`;

export const treesCommand: Command = {
  name: 'trees',
  description: `Draw the parse trees of a story, numbered (--max: at most n, default ${DEFAULT_TREE_LIMIT})`,
  usage: TREES_USAGE,
  async run({ commandArguments, environment }) {
    const input = readGrammarCommandArguments({
      commandArguments,
      rules: {
        flags: [],
        valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION, MAX_OPTION],
      },
      usage: TREES_USAGE,
      environment,
    });
    if (typeof input === 'number') {
      return input;
    }
    const { parsed, source } = input;
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
    // Counting is cheap (dynamic programming, no trees built), so the summary always says
    // how many there are, even when only the first few are drawn.
    const count = countTrees({ grammar, recognition });
    const shown = parseTrees({ grammar, recognition, limit });
    const summary = formatSummary({ count, shown: shown.length });
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

/**
 * '1 tree', '4 trees: the grammar is ambiguous for this input', or, when the limit cut the
 * list, 'The first 3 of 4 trees: … (--max n draws more)'. With a cycle there are infinitely
 * many, and only the ones that go around no cycle are drawn.
 */
function formatSummary({ count, shown }: { count: TreeCount; shown: number }): string {
  if (count === 1n) {
    return '1 tree';
  }
  const ambiguity = 'the grammar is ambiguous for this input';
  if (count === 'infinite') {
    // The enumeration skips the branches that go around a cycle, so it never builds more.
    return `Infinitely many trees (a cycle A ⇒+ A): ${ambiguity}. Drawn: ${shown}, the ones that go around no cycle`;
  }
  if (BigInt(shown) === count) {
    return `${count} trees: ${ambiguity}`;
  }
  return `The first ${shown} of ${count} trees: ${ambiguity} (${MAX_OPTION} n draws more)`;
}
