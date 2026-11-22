/**
 * Concept: two languages compared up to a length k: the sentences only one grammar
 * generates. A difference proves L(G) ≠ L(H); none up to k proves nothing.
 * Guide: docs/guides/27-busquedas-acotadas.md
 */
import { compareLanguages } from '../../bounded/compare.js';
import type { SymbolName } from '../../grammar/types.js';
import { parseArguments } from '../arguments.js';
import { builtInGrammarSource, readGrammar } from '../grammar-source.js';
import { MAX_LENGTH_MESSAGE, MAX_LENGTH_OPTION, parseMaxLength } from '../max-length.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const COMPARE_USAGE = `sabueso compare <grammar> <grammar> ${MAX_LENGTH_OPTION} <k>`;

export const compareCommand: Command = {
  name: 'compare',
  description: 'Compare two languages up to length k: the sentences only one grammar generates',
  usage: COMPARE_USAGE,
  async run({ commandArguments, environment }) {
    const parsed = parseArguments({
      commandArguments,
      rules: { flags: [], valueOptions: [MAX_LENGTH_OPTION] },
    });
    if (typeof parsed === 'string') {
      return reportUsageError({ message: parsed, environment });
    }
    const [firstName, secondName, ...extra] = parsed.positionals;
    if (firstName === undefined || secondName === undefined || extra.length > 0) {
      return reportUsageError({ message: `Usage: ${COMPARE_USAGE}`, environment });
    }
    const maxLength = parseMaxLength(parsed.values.get(MAX_LENGTH_OPTION));
    if (maxLength === undefined) {
      return reportUsageError({ message: MAX_LENGTH_MESSAGE, environment });
    }
    const firstSource = builtInGrammarSource(firstName);
    if (typeof firstSource === 'string') {
      return reportUsageError({ message: firstSource, environment });
    }
    const secondSource = builtInGrammarSource(secondName);
    if (typeof secondSource === 'string') {
      return reportUsageError({ message: secondSource, environment });
    }
    const first = await readGrammar({ source: firstSource, environment });
    const second = await readGrammar({ source: secondSource, environment });
    const comparison = compareLanguages({ first, second, maxLength });
    const same =
      comparison.onlyInFirst.length === 0 && comparison.onlyInSecond.length === 0
        ? [
            `The same sentences up to length ${maxLength}. This proves nothing about longer ones: equivalence is undecidable.`,
          ]
        : [`So L(${first.name}) ≠ L(${second.name}).`];
    environment.writeOutput(
      `${[
        `${first.name} vs ${second.name}: sentences of length ≤ ${maxLength}`,
        formatList({ title: `Only in ${first.name}`, sentences: comparison.onlyInFirst }),
        formatList({ title: `Only in ${second.name}`, sentences: comparison.onlyInSecond }),
        ...same,
      ].join('\n\n')}\n`,
    );
    return EXIT_CODES.ok;
  },
};

/** 'Only in g0 (2):' and one sentence per line, or 'Only in g1: none'. */
function formatList({
  title,
  sentences,
}: {
  title: string;
  sentences: readonly SymbolName[][];
}): string {
  if (sentences.length === 0) {
    return `${title}: none`;
  }
  return [
    `${title} (${sentences.length}):`,
    ...sentences.map((sentence) => `  ${sentence.join(' ') || 'ε'}`),
  ].join('\n');
}
