/**
 * Concept: a story as a string w ∈ Σ*: its tokens with their position, and the check that
 * every one of them is in Σ of the grammar (the unknown-symbol error of case I6).
 * Reference: Hopcroft 1.5; SPEC 02, section 3.17.
 * Card: docs/concepts/01-alphabet-and-language.md
 */
import type { ParseError } from '../../earley/diagnostics.js';
import { parseGrammarText } from '../../grammar-format/parser.js';
import type { Grammar, SymbolName } from '../../grammar/types.js';
import { checkAlphabet, tokenizeSequence } from '../../input/sequence.js';
import { parseArguments } from '../arguments.js';
import { table } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammarSource,
  resolveGrammarOption,
} from '../grammars.js';
import { EXIT_CODES, type Command, type CommandLineEnvironment } from '../types.js';

const TOKENS_USAGE = `sabueso tokens ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> "<story>"`;

export const tokensCommand: Command = {
  name: 'tokens',
  description: 'Split a story into tokens and check that every one is in Σ of the grammar',
  usage: TOKENS_USAGE,
  async run(commandArguments, environment) {
    const parsed = parseArguments(commandArguments, {
      flags: [],
      valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION],
    });
    if (typeof parsed === 'string') {
      return reportUsageError(parsed, environment);
    }
    const source = resolveGrammarOption(parsed, TOKENS_USAGE);
    if (typeof source === 'string') {
      return reportUsageError(source, environment);
    }
    const { label, text } = await readGrammarSource(source, environment);
    const grammar = parseGrammarText(text, label);
    // The story can come as one quoted argument or as several words: both mean the same.
    const tokens = tokenizeSequence(parsed.positionals.join(' '));
    const error = checkAlphabet(tokens, grammar);
    environment.writeOutput(`${formatTokens(grammar, tokens, error)}\n`);
    return error === null ? EXIT_CODES.ok : EXIT_CODES.rejected;
  },
};

function reportUsageError(message: string, environment: CommandLineEnvironment): number {
  environment.writeError(`${message}\n`);
  return EXIT_CODES.usage;
}

function formatTokens(
  grammar: Grammar,
  tokens: readonly SymbolName[],
  error: ParseError | null,
): string {
  const title = `${grammar.name}: tokens of the story`;
  if (tokens.length === 0) {
    return `${title}\n\nThe story is empty: 0 tokens (the empty string ε)`;
  }
  const rows = tokens.map((token, position) => [
    String(position),
    token,
    grammar.terminals.has(token) ? 'yes' : 'no',
  ]);
  return [
    title,
    '',
    table(['Position', 'Token', 'In Σ'], rows),
    '',
    error === null ? `${tokens.length} tokens, all in Σ` : formatUnknownSymbol(grammar, error),
  ].join('\n');
}

/** 'Unknown symbol XYZ at position 1 (event 2): it is not in Σ', followed by Σ. */
function formatUnknownSymbol(grammar: Grammar, error: ParseError): string {
  const alphabet = [...grammar.terminals].sort().join(', ');
  return [
    `Unknown symbol ${error.found ?? ''} at position ${error.position} (event ${error.position + 1}): it is not in Σ`,
    `Σ = {${alphabet}}`,
  ].join('\n');
}
