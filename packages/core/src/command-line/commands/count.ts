/**
 * Concept: how many parse trees a story has, counted without building them. In G0 the
 * number grows like the Catalan numbers; in G1 it is always 1.
 * Card: docs/concepts/19-tree-count-catalan.md
 */
import { recognize } from '../../earley/recognizer.js';
import { checkAlphabet } from '../../input/sequence.js';
import { countTrees } from '../../trees/count.js';
import type { TreeCount } from '../../trees/tree.js';
import { parseArguments } from '../arguments.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { FILE_OPTION, readStory } from '../story-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const COUNT_USAGE = `sabueso count ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> "<story>" | ${FILE_OPTION} <path>`;

export const countCommand: Command = {
  name: 'count',
  description:
    'Count the parse trees of a story without building them (--file: read it from a file)',
  usage: COUNT_USAGE,
  async run({ commandArguments, environment }) {
    const parsed = parseArguments({
      commandArguments,
      rules: {
        flags: [],
        valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION, FILE_OPTION],
      },
    });
    if (typeof parsed === 'string') {
      return reportUsageError({ message: parsed, environment });
    }
    const source = resolveGrammarOption({ parsed, usage: COUNT_USAGE });
    if (typeof source === 'string') {
      return reportUsageError({ message: source, environment });
    }
    const story = await readStory({ parsed, environment });
    if (typeof story === 'string') {
      return reportUsageError({ message: story, environment });
    }
    const grammar = await readGrammar({ source, environment });
    const title = `${grammar.name}: ${story.label}`;
    if (checkAlphabet({ tokens: story.tokens, grammar }) !== null) {
      environment.writeOutput(`${title}\n\n0 trees: a symbol is not in Σ\n`);
      return EXIT_CODES.rejected;
    }
    const started = performance.now();
    const count = countTrees({
      grammar,
      recognition: recognize({ grammar, tokens: story.tokens }),
    });
    const milliseconds = Math.round(performance.now() - started);
    environment.writeOutput(`${title}\n\n${formatCount(count)}\nTime: ${milliseconds} ms\n`);
    return count === 0n ? EXIT_CODES.rejected : EXIT_CODES.ok;
  },
};

/** '8 trees: …', '1 tree', the full number with its digits, or infinitely many. */
function formatCount(count: TreeCount): string {
  if (count === 'infinite') {
    return 'Infinitely many trees: the grammar has a cycle A ⇒+ A on this input';
  }
  if (count === 0n) {
    return '0 trees: the input is not a sentence of L(G)';
  }
  if (count === 1n) {
    return '1 tree: unambiguous for this input';
  }
  const digits = count.toString().length;
  const size = digits > 6 ? ` (a number of ${digits} digits)` : '';
  return `${count} trees${size}: the grammar is ambiguous for this input`;
}
