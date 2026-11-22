/**
 * Concept: the three recognizers on every string up to a length k: how many strings, how
 * many sentences, and the disagreements (there must be none).
 * Guide: docs/guides/28-pruebas-diferenciales-y-rendimiento.md
 */
import { runDifferential, type Discrepancy } from '../../differential/differential.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  readGrammarCommandArguments,
} from '../grammar-source.js';
import { MAX_LENGTH_OPTION, parseMaxLength } from '../max-length.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

/** The longest k: |Σ|^k strings, three recognizers each (G1 with k = 4: about 41 000). */
const DIFFERENTIAL_MAX_LENGTH = 6;
const DIFFERENTIAL_USAGE = `sabueso differential ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> ${MAX_LENGTH_OPTION} <k>`;

export const differentialCommand: Command = {
  name: 'differential',
  description:
    'Run Earley, CYK and the pushdown automaton on every string up to length k: they must agree',
  usage: DIFFERENTIAL_USAGE,
  async run({ commandArguments, environment }) {
    const input = readGrammarCommandArguments({
      commandArguments,
      rules: { flags: [], valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION, MAX_LENGTH_OPTION] },
      usage: DIFFERENTIAL_USAGE,
      environment,
    });
    if (typeof input === 'number') {
      return input;
    }
    const { parsed, source } = input;
    const maxLength = parseMaxLength(parsed.values.get(MAX_LENGTH_OPTION));
    if (
      maxLength === undefined ||
      maxLength > DIFFERENTIAL_MAX_LENGTH ||
      parsed.positionals.length > 0
    ) {
      return reportUsageError({
        message: `${MAX_LENGTH_OPTION} needs a whole number from 0 to ${DIFFERENTIAL_MAX_LENGTH}`,
        environment,
      });
    }
    const grammar = await readGrammar({ source, environment });
    const report = runDifferential({ grammar, maxLength });
    const sections = [
      `${grammar.name}: Earley, CYK and the pushdown automaton on every string of length ≤ ${maxLength}`,
      [
        `Strings: ${report.strings} (all over Σ, |Σ| = ${grammar.terminals.size})`,
        `Sentences (accepted by Earley): ${report.accepted}`,
        `Discrepancies: ${report.discrepancies.length}`,
      ].join('\n'),
      report.discrepancies.length === 0
        ? 'The three recognizers agree on every string.'
        : ['Disagreements:', ...report.discrepancies.map(formatDiscrepancy)].join('\n'),
    ];
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return report.discrepancies.length === 0 ? EXIT_CODES.ok : EXIT_CODES.rejected;
  },
};

/** '  CRI REV: Earley no, CYK yes, pushdown automaton reject'. */
function formatDiscrepancy(discrepancy: Discrepancy): string {
  const answer = (value: boolean): string => (value ? 'yes' : 'no');
  return `  ${discrepancy.tokens.join(' ') || 'ε'}: Earley ${answer(discrepancy.earley)}, CYK ${answer(discrepancy.cockeYoungerKasami)}, pushdown automaton ${discrepancy.pushdownAutomaton}`;
}
