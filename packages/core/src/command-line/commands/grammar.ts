/**
 * Concept: a .grammar file read by the whole chain (DFA lexer → LL(1) parser → buildGrammar)
 * and shown as G = (N, Σ, P, S); with --parser-trace, every decision of the parser.
 * Reference: Aho, Lam, Sethi and Ullman, Compilers (2nd ed.), 4.4.
 * Card: docs/concepts/04-predictive-recursive-descent-parser.md
 */
import { tokenizeGrammar } from '../../grammar-format/lexer.js';
import {
  parseGrammarFile,
  parseGrammarText,
  type ParserTraceStep,
} from '../../grammar-format/parser.js';
import { parseArguments } from '../arguments.js';
import { formatGrammar } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  readGrammarSource,
  resolveGrammarSource,
  type GrammarText,
} from '../grammar-source.js';
import {
  EXIT_CODES,
  reportUsageError,
  type Command,
  type CommandLineEnvironment,
} from '../types.js';

const TRACE_FLAG = '--parser-trace';
const GRAMMAR_USAGE = `sabueso grammar <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${TRACE_FLAG}]`;

export const grammarCommand: Command = {
  name: 'grammar',
  description: 'Read a grammar file and print G = (N, Σ, P, S) (--parser-trace: show the parser)',
  usage: GRAMMAR_USAGE,
  async run({ commandArguments, environment }) {
    const parsed = parseArguments({
      commandArguments,
      rules: {
        flags: [TRACE_FLAG],
        valueOptions: [GRAMMAR_FILE_OPTION],
      },
    });
    if (typeof parsed === 'string') {
      return reportUsageError({ message: parsed, environment });
    }
    const source = resolveGrammarSource({ parsed, usage: GRAMMAR_USAGE });
    if (typeof source === 'string') {
      return reportUsageError({ message: source, environment });
    }
    const grammar = await readGrammarSource({ source, environment });
    printGrammar({ source: grammar, showTrace: parsed.flags.has(TRACE_FLAG), environment });
    return EXIT_CODES.ok;
  },
};

/** Prints the parser trace (if asked) and then the grammar. */
function printGrammar({
  source,
  showTrace,
  environment,
}: {
  source: GrammarText;
  showTrace: boolean;
  environment: CommandLineEnvironment;
}): void {
  const grammar = parseGrammarText({ text: source.text, name: source.label });
  if (showTrace) {
    // The grammar is valid (parseGrammarText did not throw), so this parse succeeds too.
    const trace = parseGrammarFile(tokenizeGrammar(source.text)).trace.map(formatTraceStep);
    environment.writeOutput(`Parser trace (nonterminal [lookahead] → alternative):\n\n`);
    environment.writeOutput(`${trace.join('\n')}\n\n`);
  }
  environment.writeOutput(`${formatGrammar(grammar)}\n`);
}

/** '    Sequence [IDENTIFIER] → Symbols', indented by the depth of the call. */
function formatTraceStep(step: ParserTraceStep): string {
  const indent = '  '.repeat(step.depth);
  return `${indent}${step.nonterminal} [${step.lookahead.kind}] → ${step.alternative}`;
}
