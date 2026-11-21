/**
 * Concept: the sentences of L(G) up to a length k, one per line, shortest first.
 * Card: docs/concepts/25-bounded-searches.md
 */
import { generateSentences } from '../../bounded/generate.js';
import { parseArguments } from '../arguments.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { MAX_LENGTH_MESSAGE, MAX_LENGTH_OPTION, parseMaxLength } from '../max-length.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const GENERATE_USAGE = `sabueso generate ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> ${MAX_LENGTH_OPTION} <k>`;

export const generateCommand: Command = {
  name: 'generate',
  description: 'List every sentence of L(G) with at most k tokens, shortest first',
  usage: GENERATE_USAGE,
  async run({ commandArguments, environment }) {
    const parsed = parseArguments({
      commandArguments,
      rules: { flags: [], valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION, MAX_LENGTH_OPTION] },
    });
    if (typeof parsed === 'string') {
      return reportUsageError({ message: parsed, environment });
    }
    const source = resolveGrammarOption({ parsed, usage: GENERATE_USAGE });
    if (typeof source === 'string') {
      return reportUsageError({ message: source, environment });
    }
    const maxLength = parseMaxLength(parsed.values.get(MAX_LENGTH_OPTION));
    if (maxLength === undefined || parsed.positionals.length > 0) {
      return reportUsageError({ message: MAX_LENGTH_MESSAGE, environment });
    }
    const grammar = await readGrammar({ source, environment });
    const sentences = generateSentences({ grammar, maxLength });
    const lines = sentences.map((sentence) => `  ${sentence.join(' ') || 'ε'}`);
    environment.writeOutput(
      `${[
        `${grammar.name}: sentences of length ≤ ${maxLength}`,
        `${sentences.length} ${sentences.length === 1 ? 'sentence' : 'sentences'}`,
        ...(lines.length > 0 ? [lines.join('\n')] : []),
      ].join('\n\n')}\n`,
    );
    return EXIT_CODES.ok;
  },
};
