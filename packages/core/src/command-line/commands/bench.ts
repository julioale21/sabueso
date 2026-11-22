/**
 * Concept: how long each stage of the analysis of one story takes: recognition, one tree, its
 * derivation and the tree count. The criterion of the proposal: G1 with L1 in under a second.
 * Guide: docs/guides/28-pruebas-diferenciales-y-rendimiento.md
 */
import { checkAlphabet } from '../../input/sequence.js';
import { benchmark } from '../../performance/benchmark.js';
import { formatRejection, formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  readGrammarCommandArguments,
} from '../grammar-source.js';
import { FILE_OPTION, readStory } from '../story-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const BENCH_USAGE = `sabueso bench ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> "<story>" | ${FILE_OPTION} <path>`;

export const benchCommand: Command = {
  name: 'bench',
  description:
    'Time each stage of the analysis of a story: recognition, tree, derivation and count',
  usage: BENCH_USAGE,
  async run({ commandArguments, environment }) {
    const input = readGrammarCommandArguments({
      commandArguments,
      rules: { flags: [], valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION, FILE_OPTION] },
      usage: BENCH_USAGE,
      environment,
    });
    if (typeof input === 'number') {
      return input;
    }
    const { parsed, source } = input;
    const story = await readStory({ parsed, environment });
    if (typeof story === 'string') {
      return reportUsageError({ message: story, environment });
    }
    const grammar = await readGrammar({ source, environment });
    const title = `${grammar.name}: timing of ${story.label}`;
    const unknown = checkAlphabet({ tokens: story.tokens, grammar });
    if (unknown !== null) {
      environment.writeOutput(`${title}\n\n${formatRejection(unknown)}\n`);
      return EXIT_CODES.rejected;
    }
    const result = benchmark({ grammar, tokens: story.tokens });
    const milliseconds = (value: number | null): string =>
      value === null ? '—' : `${value.toFixed(1)} ms`;
    const total =
      result.recognitionMs + (result.treeMs ?? 0) + (result.derivationMs ?? 0) + result.countMs;
    const count =
      result.treeCount === 'infinite' ? 'infinitely many' : formatCount(result.treeCount);
    const rows = [
      [
        'Recognition (Earley)',
        milliseconds(result.recognitionMs),
        `${result.items} items in the chart`,
      ],
      [
        'First tree',
        milliseconds(result.treeMs),
        result.accepted ? '1 tree built' : 'rejected: no tree',
      ],
      ['Leftmost derivation', milliseconds(result.derivationMs), ''],
      ['Tree count', milliseconds(result.countMs), count],
      ['Total', milliseconds(total), ''],
    ];
    environment.writeOutput(
      `${[title, `${result.accepted ? 'ACCEPTED' : 'REJECTED'} · ${result.events} events`, formatTable({ header: ['Stage', 'Time', 'Result'], rows })].join('\n\n')}\n`,
    );
    return result.accepted ? EXIT_CODES.ok : EXIT_CODES.rejected;
  },
};

/** '1 tree', '4 trees', or 'a number of 115 digits' for a very large count. */
function formatCount(count: bigint): string {
  const digits = String(count);
  if (digits.length > 12) {
    return `a number of ${digits.length} digits`;
  }
  return `${digits} ${count === 1n ? 'tree' : 'trees'}`;
}
