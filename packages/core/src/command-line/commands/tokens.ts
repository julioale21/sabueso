/**
 * Concept: a story as a string w ∈ Σ*: its tokens with their position, and the check that
 * every one of them is in Σ of the grammar (the unknown-symbol error of case I6).
 * Card: docs/concepts/01-alphabet-and-language.md
 */
import type { ParseError } from '../../earley/diagnostics.js';
import type { Grammar, SymbolName } from '../../grammar/types.js';
import { checkAlphabet, tokenizeSequence } from '../../input/sequence.js';
import { parseArguments } from '../arguments.js';
import { formatSet, formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const TOKENS_USAGE = `sabueso tokens ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> "<story>"`;

export const tokensCommand: Command = {
  name: 'tokens',
  description: 'Split a story into tokens and check that every one is in Σ of the grammar',
  usage: TOKENS_USAGE,
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
    const source = resolveGrammarOption({ parsed, usage: TOKENS_USAGE });
    if (typeof source === 'string') {
      return reportUsageError({ message: source, environment });
    }
    const grammar = await readGrammar({ source, environment });
    // The story can come as one quoted argument or as several words: both mean the same.
    const tokens = tokenizeSequence(parsed.positionals.join(' '));
    const error = checkAlphabet({ tokens, grammar });
    environment.writeOutput(`${formatTokens({ grammar, tokens, error })}\n`);
    return error === null ? EXIT_CODES.ok : EXIT_CODES.rejected;
  },
};

/** The table of the tokens of the story (position, token, in Σ) and the closing line. */
function formatTokens({
  grammar,
  tokens,
  error,
}: {
  grammar: Grammar;
  tokens: readonly SymbolName[];
  error: ParseError | null;
}): string {
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
    formatTable({ header: ['Position', 'Token', 'In Σ'], rows }),
    '',
    error === null ? `${tokens.length} tokens, all in Σ` : formatUnknownSymbol({ grammar, error }),
  ].join('\n');
}

/** 'Unknown symbol XYZ at position 1 (event 2): it is not in Σ', followed by Σ. */
function formatUnknownSymbol({ grammar, error }: { grammar: Grammar; error: ParseError }): string {
  return [
    `Unknown symbol ${error.found ?? ''} at position ${error.position} (event ${error.position + 1}): it is not in Σ`,
    `Σ = ${formatSet(grammar.terminals)}`,
  ].join('\n');
}
