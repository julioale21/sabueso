/**
 * Concept: the leftmost derivation of a story, S ⇒ … ⇒ w, one numbered sentential form per
 * step with the production applied. With --tree, the derivation of another tree: two
 * different leftmost derivations of the same story mean the grammar is ambiguous.
 * Card: docs/concepts/20-leftmost-derivation.md
 */
import { recognize } from '../../earley/recognizer.js';
import { formatProduction } from '../../grammar/build.js';
import { checkAlphabet } from '../../input/sequence.js';
import { leftmostDerivation, type DerivationStep } from '../../trees/derivation.js';
import { parseTrees } from '../../trees/enumerate.js';
import { parseArguments } from '../arguments.js';
import { formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { readStory } from '../story-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const TREE_OPTION = '--tree';
const DERIVE_USAGE = `sabueso derive ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${TREE_OPTION} <k>] "<story>"`;

export const deriveCommand: Command = {
  name: 'derive',
  description: 'Write the leftmost derivation of a story, step by step (--tree: of tree number k)',
  usage: DERIVE_USAGE,
  async run({ commandArguments, environment }) {
    const parsed = parseArguments({
      commandArguments,
      rules: {
        flags: [],
        valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION, TREE_OPTION],
      },
    });
    if (typeof parsed === 'string') {
      return reportUsageError({ message: parsed, environment });
    }
    const source = resolveGrammarOption({ parsed, usage: DERIVE_USAGE });
    if (typeof source === 'string') {
      return reportUsageError({ message: source, environment });
    }
    const treeNumber = Number(parsed.values.get(TREE_OPTION) ?? '1');
    if (!Number.isInteger(treeNumber) || treeNumber < 1) {
      return reportUsageError({
        message: `${TREE_OPTION} needs a whole number greater than 0`,
        environment,
      });
    }
    const story = await readStory({ parsed, environment });
    if (typeof story === 'string') {
      return reportUsageError({ message: story, environment });
    }
    const grammar = await readGrammar({ source, environment });
    const title = `${grammar.name}: leftmost derivation of ${story.label}`;
    const recognition =
      checkAlphabet({ tokens: story.tokens, grammar }) === null
        ? recognize({ grammar, tokens: story.tokens })
        : undefined;
    const tree =
      recognition === undefined
        ? undefined
        : parseTrees({ grammar, recognition, limit: treeNumber })[treeNumber - 1];
    if (recognition === undefined || !recognition.accepted) {
      environment.writeOutput(`${title}\n\nREJECTED: the input has no derivation\n`);
      return EXIT_CODES.rejected;
    }
    if (tree === undefined) {
      return reportUsageError({
        message: `The input has fewer than ${treeNumber} trees`,
        environment,
      });
    }
    const steps = leftmostDerivation(tree);
    environment.writeOutput(
      [title, `Tree ${treeNumber}, ${steps.length - 1} steps:`, formatSteps(steps)].join('\n\n') +
        '\n',
    );
    return EXIT_CODES.ok;
  },
};

/** One row per step: its number, the sentential form, and the production applied. */
function formatSteps(steps: readonly DerivationStep[]): string {
  const rows = steps.map((step, index) => [
    String(index),
    `${index === 0 ? '  ' : '⇒ '}${step.form.length === 0 ? 'ε' : step.form.join(' ')}`,
    step.production === null ? '' : formatProduction(step.production),
  ]);
  return formatTable({ header: ['Step', 'Sentential form', 'Production applied'], rows });
}
