/**
 * Concept: the lexer of the .grammar format as an explicit DFA table (states q0…q12).
 * Reference: Hopcroft 2.2; Augusto 1.3.
 * Card: docs/concepts/03-finite-automaton-lexer.md
 * Guide (state graph and δ table): docs/guides/03-finite-automaton-lexer.md
 */
import {
  AutomatonStoppedError,
  runDeterministicAutomaton,
  type AutomatonEvent,
  type AutomatonToken,
  type DeterministicAutomatonDefinition,
} from '../automata/deterministic-finite-automaton.js';

/** The tokens of the .grammar format: the terminals of meta.grammar. */
export type TokenKind =
  | 'IDENTIFIER'
  | 'LITERAL'
  | 'ARROW'
  | 'BAR'
  | 'EPSILON'
  | 'NEWLINE'
  | 'START'
  | 'TERMINALS'
  | 'END_OF_FILE';

export interface Token {
  kind: TokenKind;
  /** The token as it reads: a literal without its quotes, a directive with its '%'. */
  text: string;
  line: number;
  column: number;
}

/** A .grammar file that cannot be read; the position points at the offending character. */
export class GrammarSyntaxError extends Error {
  readonly line: number;
  readonly column: number;

  constructor({ message, line, column }: { message: string; line: number; column: number }) {
    super(`Line ${line}, column ${column}: ${message}`);
    this.line = line;
    this.column = column;
    this.name = 'GrammarSyntaxError';
  }
}

/**
 * Q: the 13 states, named after the state graph of the guide. Each name starts with its
 * number (q0…q12) and says what the state means:
 *
 * - reading…: inside something that can go on (the state has a loop);
 * - …Read: a complete token was read (the state has no exits);
 * - expecting…: something incomplete was read; stopping here is an error.
 */
export const lexerStates = [
  'q0Start',
  'q1ReadingIdentifier',
  'q2ExpectingArrowHead',
  'q3ArrowRead',
  'q4BarRead',
  'q5EpsilonRead',
  'q6ReadingLiteral',
  'q7LiteralRead',
  'q8ExpectingDirectiveName',
  'q9ReadingDirective',
  'q10ReadingComment',
  'q11ReadingSpaces',
  'q12NewlineRead',
] as const;

export type LexerState = (typeof lexerStates)[number];

/** Σ of the automaton: the class of each character (guide, section 3). */
const characterClasses = [
  'letter',
  'digit',
  'whitespace',
  'lineBreak',
  'hyphen',
  'greaterThan',
  'unicodeArrow',
  'verticalBar',
  'epsilonSign',
  'singleQuote',
  'hash',
  'percentSign',
  'otherCharacter',
] as const;

export type CharacterClass = (typeof characterClasses)[number];

/** What the automaton emits. A directive is resolved to START or TERMINALS afterwards. */
type LexemeKind = 'IDENTIFIER' | 'LITERAL' | 'ARROW' | 'BAR' | 'EPSILON' | 'NEWLINE' | 'DIRECTIVE';

const singleCharacterClasses: Partial<Record<string, CharacterClass>> = {
  ' ': 'whitespace',
  '\t': 'whitespace',
  '\r': 'whitespace',
  '\n': 'lineBreak',
  '-': 'hyphen',
  '>': 'greaterThan',
  '→': 'unicodeArrow',
  '|': 'verticalBar',
  ε: 'epsilonSign',
  "'": 'singleQuote',
  '#': 'hash',
  '%': 'percentSign',
  _: 'letter',
};

/** ε is a Greek letter, but it has its own class, so it is checked before the letters. */
// The alphabet of the DFA is not the characters but 13 classes. So δ has 13 columns
// instead of thousands (one per Unicode character), and the table can be drawn and defended.
export function classifyCharacter(character: string): CharacterClass {
  const special = singleCharacterClasses[character];
  if (special !== undefined) {
    return special;
  }
  if (/^\p{L}$/u.test(character)) {
    return 'letter';
  }
  return /^[0-9]$/.test(character) ? 'digit' : 'otherCharacter';
}

/** A row of δ that goes to `target` on every class except the given ones. */
function everyClassExcept({
  excluded,
  target,
}: {
  excluded: readonly CharacterClass[];
  target: LexerState;
}): Partial<Record<CharacterClass, LexerState>> {
  const row: Partial<Record<CharacterClass, LexerState>> = {};
  for (const characterClass of characterClasses) {
    if (!excluded.includes(characterClass)) {
      row[characterClass] = target;
    }
  }
  return row;
}

/** M = (Q, Σ, δ, q0, F) of the .grammar format. Same table as the guide, section 4.2. */
export const grammarLexerAutomaton: DeterministicAutomatonDefinition<
  LexerState,
  CharacterClass,
  LexemeKind
> = {
  // This is M = (Q, Σ, δ, q0, F) written as data: each row of `transitions` is a
  // row of the δ table of guide 03. A state with no entry for a class = no
  // transition (δ is partial), and the token ends there.
  initialState: 'q0Start',
  classifyCharacter,
  transitions: {
    q0Start: {
      letter: 'q1ReadingIdentifier',
      hyphen: 'q2ExpectingArrowHead',
      unicodeArrow: 'q3ArrowRead',
      verticalBar: 'q4BarRead',
      epsilonSign: 'q5EpsilonRead',
      singleQuote: 'q6ReadingLiteral',
      percentSign: 'q8ExpectingDirectiveName',
      hash: 'q10ReadingComment',
      whitespace: 'q11ReadingSpaces',
      lineBreak: 'q12NewlineRead',
    },
    q1ReadingIdentifier: { letter: 'q1ReadingIdentifier', digit: 'q1ReadingIdentifier' },
    q2ExpectingArrowHead: { greaterThan: 'q3ArrowRead' },
    q3ArrowRead: {},
    q4BarRead: {},
    q5EpsilonRead: {},
    q6ReadingLiteral: {
      ...everyClassExcept({ excluded: ['singleQuote', 'lineBreak'], target: 'q6ReadingLiteral' }),
      singleQuote: 'q7LiteralRead',
    },
    q7LiteralRead: {},
    q8ExpectingDirectiveName: { letter: 'q9ReadingDirective' },
    q9ReadingDirective: { letter: 'q9ReadingDirective' },
    q10ReadingComment: everyClassExcept({ excluded: ['lineBreak'], target: 'q10ReadingComment' }),
    q11ReadingSpaces: { whitespace: 'q11ReadingSpaces' },
    q12NewlineRead: {},
  },
  acceptingStates: {
    q1ReadingIdentifier: 'IDENTIFIER',
    q3ArrowRead: 'ARROW',
    q4BarRead: 'BAR',
    q5EpsilonRead: 'EPSILON',
    q7LiteralRead: 'LITERAL',
    q9ReadingDirective: 'DIRECTIVE',
    q10ReadingComment: null,
    q11ReadingSpaces: null,
    q12NewlineRead: 'NEWLINE',
  },
};

/** The reserved words of the directives (guide, section 4.4). */
const directives: Partial<Record<string, TokenKind>> = {
  '%start': 'START',
  '%terminals': 'TERMINALS',
};

/**
 * Splits a .grammar text into tokens:
 *
 * 1. The DFA reads the lexemes (maximal munch) and discards spaces and comments.
 * 2. Each lexeme becomes a token: literals lose their quotes, directives are resolved.
 * 3. A NEWLINE is added if the text does not end with one, then END_OF_FILE, so every
 *    line, including the last, ends in NEWLINE for the parser.
 *
 * Throws GrammarSyntaxError with the line and column of the problem.
 */
export function tokenizeGrammar({
  text,
  onEvent,
}: {
  text: string;
  /** Called on each step of the DFA (the --states table of the lex command). */
  onEvent?: ((event: AutomatonEvent<LexerState, LexemeKind>) => void) | undefined;
}): Token[] {
  // Two stages: the DFA recognizes lexemes (regular level), then each lexeme becomes
  // a token (quotes removed, %start/%terminals resolved). The final NEWLINE and END_OF_FILE
  // guarantee the parser that every line ends the same way and that there is always a
  // token to look at (END_OF_FILE plays the role of $, the end of the input).
  const tokens = readLexemes({ text, onEvent }).map(toToken);
  return [...tokens, ...closingTokens({ text, tokens })];
}

/** Runs the DFA over the text and turns a stop of the automaton into a GrammarSyntaxError. */
function readLexemes({
  text,
  onEvent,
}: {
  text: string;
  onEvent?: ((event: AutomatonEvent<LexerState, LexemeKind>) => void) | undefined;
}): AutomatonToken<LexemeKind>[] {
  try {
    return runDeterministicAutomaton(grammarLexerAutomaton, text, onEvent);
  } catch (error) {
    if (error instanceof AutomatonStoppedError) {
      throw toSyntaxError(error as AutomatonStoppedError<LexerState>);
    }
    throw error;
  }
}

/** Turns a lexeme into a token: a literal loses its quotes, a directive becomes START or TERMINALS. */
function toToken(lexeme: AutomatonToken<LexemeKind>): Token {
  const position = { line: lexeme.line, column: lexeme.column };
  switch (lexeme.kind) {
    case 'LITERAL':
      return { kind: 'LITERAL', text: lexeme.text.slice(1, -1), ...position };
    case 'NEWLINE':
      return { kind: 'NEWLINE', text: '', ...position };
    case 'DIRECTIVE':
      return { kind: resolveDirective(lexeme), text: lexeme.text, ...position };
    default:
      return { kind: lexeme.kind, text: lexeme.text, ...position };
  }
}

/** Looks up '%start' or '%terminals' in the table of reserved words; anything else is an error. */
function resolveDirective(lexeme: AutomatonToken<LexemeKind>): TokenKind {
  const kind = directives[lexeme.text];
  if (kind === undefined) {
    throw new GrammarSyntaxError({
      message: `Unknown directive "${lexeme.text}": expected %start or %terminals`,
      line: lexeme.line,
      column: lexeme.column,
    });
  }
  return kind;
}

/** The final NEWLINE (only if missing) and END_OF_FILE, both at the end of the text. */
function closingTokens({ text, tokens }: { text: string; tokens: readonly Token[] }): Token[] {
  const end = endPosition(text);
  const closing: Token[] = [];
  if (tokens.at(-1)?.kind !== 'NEWLINE') {
    closing.push({ kind: 'NEWLINE', text: '', ...end });
  }
  closing.push({ kind: 'END_OF_FILE', text: '', ...end });
  return closing;
}

/** The position just after the last character. */
function endPosition(text: string): { line: number; column: number } {
  const lines = text.split('\n');
  const lastLine = lines.at(-1) ?? '';
  return { line: lines.length, column: lastLine.length + 1 };
}

/**
 * The states where a token can be left half read, with the error each one means
 * (guide, section 6). Stopping in any other state means the character itself is invalid.
 */
const unfinishedTokenMessages: Partial<Record<LexerState, string>> = {
  q2ExpectingArrowHead: "Expected '>' after '-'",
  q6ReadingLiteral: 'Unterminated literal: missing the closing quote',
  q8ExpectingDirectiveName: "Expected a directive name after '%'",
};

/** Turns "the automaton stopped in state q" into the lexical error that state means. */
function toSyntaxError(error: AutomatonStoppedError<LexerState>): GrammarSyntaxError {
  const message = unfinishedTokenMessages[error.state];
  return message === undefined
    ? new GrammarSyntaxError({
        message: `Invalid character '${error.character ?? ''}'`,
        line: error.line,
        column: error.column,
      })
    : new GrammarSyntaxError({ message, line: error.tokenLine, column: error.tokenColumn });
}
