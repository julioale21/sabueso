/**
 * Concept: the trace of Earley: every item the algorithm adds, numbered in order, with the
 * operation that added it and its cause. The same information as the step-by-step player
 * of the web, as text.
 */
import { diagnose } from '../../earley/diagnostics.js';
import { recognize } from '../../earley/recognizer.js';
import type { TraceEvent, TraceOperation } from '../../earley/trace.js';
import { checkAlphabet, tokenizeSequence } from '../../input/sequence.js';
import { formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  readGrammarCommandArguments,
} from '../grammar-source.js';
import { EXIT_CODES, type Command } from '../types.js';

const TRACE_USAGE = `sabueso trace ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> "<story>"`;

/** How each operation is called in the trace. */
const operationNames: Record<TraceOperation, string> = {
  predict: 'PREDICTOR',
  scan: 'SCANNER',
  complete: 'COMPLETER',
  nullable: 'NULLABLE',
};

export const traceCommand: Command = {
  name: 'trace',
  description: 'Show every step of Earley in order: what was added, by which operation and why',
  usage: TRACE_USAGE,
  async run({ commandArguments, environment }) {
    const input = readGrammarCommandArguments({
      commandArguments,
      rules: {
        flags: [],
        valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION],
      },
      usage: TRACE_USAGE,
      environment,
    });
    if (typeof input === 'number') {
      return input;
    }
    const { parsed, source } = input;
    const grammar = await readGrammar({ source, environment });
    const tokens = tokenizeSequence(parsed.positionals.join(' '));
    const title = `${grammar.name}: trace of ${tokens.length === 0 ? '(empty input)' : tokens.join(' ')}`;
    const unknown = checkAlphabet({ tokens, grammar });
    if (unknown !== null) {
      environment.writeOutput(`${title}\n\nREJECTED · ${unknown.found ?? ''} is not in Σ\n`);
      return EXIT_CODES.rejected;
    }
    const { accepted, chart, trace } = recognize({ grammar, tokens, options: { trace: true } });
    const verdict =
      diagnose({ grammar, chart, tokens, accepted }) === null
        ? 'ACCEPTED: the input is a sentence of L(G)'
        : 'REJECTED: see `sabueso earley` for where and why';
    environment.writeOutput(
      [
        title,
        `${trace.length} events (the initial item $S → • ${grammar.start}, 0 is in S0 before the first one)`,
        formatTrace(trace),
        verdict,
      ].join('\n\n') + '\n',
    );
    return accepted ? EXIT_CODES.ok : EXIT_CODES.rejected;
  },
};

/** '#8  S1  SCANNER  Hecho → CRI • HallazgoOpc, 0  ← token 0 CRI', one row per event. */
function formatTrace(trace: readonly TraceEvent[]): string {
  const rows = trace.map((event, index) => [
    `#${index + 1}`,
    `S${event.set}`,
    operationNames[event.op],
    event.isNew ? event.item : `${event.item} (again: one more link)`,
    `← ${event.cause}`,
  ]);
  return formatTable({ header: ['Event', 'Set', 'Operation', 'Item added', 'Cause'], rows });
}
