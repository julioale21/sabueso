/**
 * Concept: the bounded search for a witness of ambiguity: the shortest sentence with two or
 * more trees, and its first two trees. A semidecision: a witness proves the grammar
 * ambiguous; none up to k proves nothing.
 * Guide: docs/guides/27-busquedas-acotadas.md
 */
import { findAmbiguityWitness } from '../../bounded/ambiguity.js';
import { recognize } from '../../earley/recognizer.js';
import { parseTrees } from '../../trees/enumerate.js';
import { renderTree } from '../../trees/render.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  readGrammarCommandArguments,
} from '../grammar-source.js';
import { MAX_LENGTH_MESSAGE, MAX_LENGTH_OPTION, parseMaxLength } from '../max-length.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const AMBIGUITY_USAGE = `sabueso ambiguity ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> ${MAX_LENGTH_OPTION} <k>`;

export const ambiguityCommand: Command = {
  name: 'ambiguity',
  description:
    'Search the shortest sentence with more than one tree, up to length k (a semidecision)',
  usage: AMBIGUITY_USAGE,
  async run({ commandArguments, environment }) {
    const input = readGrammarCommandArguments({
      commandArguments,
      rules: { flags: [], valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION, MAX_LENGTH_OPTION] },
      usage: AMBIGUITY_USAGE,
      environment,
    });
    if (typeof input === 'number') {
      return input;
    }
    const { parsed, source } = input;
    const maxLength = parseMaxLength(parsed.values.get(MAX_LENGTH_OPTION));
    if (maxLength === undefined || parsed.positionals.length > 0) {
      return reportUsageError({ message: MAX_LENGTH_MESSAGE, environment });
    }
    const grammar = await readGrammar({ source, environment });
    const title = `${grammar.name}: witness of ambiguity up to length ${maxLength}`;
    const witness = findAmbiguityWitness({ grammar, maxLength });
    if (witness === null) {
      environment.writeOutput(
        `${title}\n\nNo witness up to length ${maxLength}: every sentence has exactly one tree.\nThis proves nothing about longer sentences: ambiguity is undecidable.\nTo prove a grammar unambiguous, show it is LL(1): \`sabueso predictive-table\`.\n`,
      );
      return EXIT_CODES.ok;
    }
    const count = witness.treeCount === 'infinite' ? 'infinitely many' : String(witness.treeCount);
    const trees = parseTrees({
      grammar,
      recognition: recognize({ grammar, tokens: witness.sentence }),
      limit: 2,
    });
    environment.writeOutput(
      `${[
        title,
        `WITNESS: ${witness.sentence.join(' ') || 'ε'} has ${count} trees, so the grammar is ambiguous`,
        ...trees.map((tree, index) => `Tree ${index + 1}:\n${renderTree(tree)}`),
      ].join('\n\n')}\n`,
    );
    return EXIT_CODES.ok;
  },
};
