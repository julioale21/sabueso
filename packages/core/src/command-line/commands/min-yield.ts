/**
 * Concept: the minimum yield of each nonterminal: how many terminals, at least, any string
 * it derives has. For the start symbol, the length of the shortest sentence of L(G).
 * Reference: SPEC 02, section 3.10.
 * Card: docs/concepts/10-minimum-yield.md
 */
import { computeMinYield } from '../../analysis/min-yield.js';
import type { Grammar, SymbolName } from '../../grammar/types.js';
import { parseArguments } from '../arguments.js';
import { formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const MIN_YIELD_USAGE = `sabueso min-yield ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path>`;

export const minYieldCommand: Command = {
  name: 'min-yield',
  description: 'Compute the length of the shortest string each nonterminal derives',
  usage: MIN_YIELD_USAGE,
  async run({ commandArguments, environment }) {
    const parsed = parseArguments({
      commandArguments,
      rules: {
        flags: [],
        valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION],
      },
    });
    if (typeof parsed === 'string') {
      return reportUsageError({ message: parsed, environment });
    }
    const source = resolveGrammarOption({ parsed, usage: MIN_YIELD_USAGE });
    if (typeof source === 'string') {
      return reportUsageError({ message: source, environment });
    }
    if (parsed.positionals.length > 0) {
      return reportUsageError({ message: `Usage: ${MIN_YIELD_USAGE}`, environment });
    }
    const grammar = await readGrammar({ source, environment });
    const minYield = computeMinYield(grammar);
    environment.writeOutput(
      [
        `${grammar.name}: minimum yield (length of the shortest string each nonterminal derives)`,
        formatMinYieldTable({ grammar, minYield }),
        formatShortestSentence({ grammar, minYield }),
      ].join('\n\n') + '\n',
    );
    return EXIT_CODES.ok;
  },
};

/** One row per nonterminal, in the order of the grammar. */
function formatMinYieldTable({
  grammar,
  minYield,
}: {
  grammar: Grammar;
  minYield: ReadonlyMap<SymbolName, number>;
}): string {
  const rows = [...grammar.nonterminals].map((nonterminal) => [
    nonterminal,
    formatLength(minYield.get(nonterminal) ?? Infinity),
  ]);
  return formatTable({ header: ['Nonterminal', 'minYield'], rows });
}

/** The closing line: the length of the shortest sentence, or that L(G) = ∅. */
function formatShortestSentence({
  grammar,
  minYield,
}: {
  grammar: Grammar;
  minYield: ReadonlyMap<SymbolName, number>;
}): string {
  const length = minYield.get(grammar.start) ?? Infinity;
  return length === Infinity
    ? `minYield(${grammar.start}) = ∞: the start symbol derives no string, so L(G) = ∅`
    : `The shortest sentence of L(G) has length ${length}: minYield(${grammar.start}) = ${length}${length === 0 ? ', so ε ∈ L(G)' : ''}`;
}

/** '∞ (derives no string)' for a nonterminal that is not productive. */
function formatLength(length: number): string {
  return length === Infinity ? '∞ (derives no string)' : String(length);
}
