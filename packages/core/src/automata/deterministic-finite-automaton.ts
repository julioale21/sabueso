/**
 * Concept: deterministic finite automaton M = (Q, Σ, δ, q0, F) run as a lexer, with maximal munch.
 * Reference: Hopcroft 2.2; Augusto 1.3.
 * Card: docs/concepts/03-finite-automaton-lexer.md
 */

/**
 * A DFA described as data. The executor below knows nothing about any particular format:
 * each lexer is just one of these tables.
 *
 * - State: the names of the states (Q).
 * - CharacterClass: the character classes, the alphabet of the automaton (Σ).
 * - TokenKind: the token kinds that the accepting states emit.
 */
export interface DeterministicAutomatonDefinition<
  State extends string,
  CharacterClass extends string,
  TokenKind extends string,
> {
  /** q0: every token starts here. */
  initialState: State;
  /** Maps a character to its class, so δ has one column per class instead of per character. */
  classifyCharacter: (character: string) => CharacterClass;
  /** δ: one row per state. A missing entry means "no transition", and the automaton stops. */
  transitions: Record<State, Partial<Record<CharacterClass, State>>>;
  /** F: the token kind each accepting state emits, or null to recognize and discard it. */
  acceptingStates: Partial<Record<State, TokenKind | null>>;
}

/** A recognized token: its kind, its exact text and where it starts (1-based). */
export interface AutomatonToken<TokenKind> {
  kind: TokenKind;
  text: string;
  line: number;
  column: number;
}

/** What the automaton did, step by step, for traces like `lex --states`. */
export type AutomatonEvent<State, TokenKind> =
  | { type: 'transition'; from: State; character: string; to: State }
  | { type: 'accept'; state: State; text: string; kind: TokenKind | null };

/**
 * The automaton stopped in a state that does not accept: the text is not a sequence of
 * tokens. It reports the state, so each lexer can turn it into a precise message.
 */
export class AutomatonStoppedError<State extends string> extends Error {
  constructor(
    /** The state where the automaton stopped. */
    readonly state: State,
    /** The character with no transition, or undefined at the end of the text. */
    readonly character: string | undefined,
    /** Position of that character (or of the end of the text). */
    readonly line: number,
    readonly column: number,
    /** Position where the unfinished token started. */
    readonly tokenLine: number,
    readonly tokenColumn: number,
  ) {
    super(`The automaton stopped in state "${state}" at line ${line}, column ${column}`);
    this.name = 'AutomatonStoppedError';
  }
}

/** A position in the text: the index of a character and its line and column. */
interface Cursor {
  index: number;
  line: number;
  column: number;
}

/**
 * Splits a text into tokens with the given DFA, applying maximal munch: each token is read
 * from q0 while there is a transition, so it is as long as possible.
 *
 * Throws AutomatonStoppedError if a token ends in a state that does not accept.
 */
export function runDeterministicAutomaton<
  State extends string,
  CharacterClass extends string,
  TokenKind extends string,
>(
  automaton: DeterministicAutomatonDefinition<State, CharacterClass, TokenKind>,
  text: string,
  onEvent?: (event: AutomatonEvent<State, TokenKind>) => void,
): AutomatonToken<TokenKind>[] {
  // A DFA only accepts or rejects a string. To use it as a lexer, it runs many
  // times: each token is one run from q0. When δ has no transition, the run ends;
  // if the state ∈ F, what was read is a token, and it goes back to q0 with the rest.
  const tokens: AutomatonToken<TokenKind>[] = [];
  let cursor: Cursor = { index: 0, line: 1, column: 1 };
  while (cursor.index < text.length) {
    const end = readLongestToken(automaton, text, cursor, onEvent);
    const lexeme = text.slice(cursor.index, end.index);
    const kind = tokenKindOfFinalState(automaton, cursor, end, text[end.index]);
    onEvent?.({ type: 'accept', state: end.state, text: lexeme, kind });
    if (kind !== null) {
      tokens.push({ kind, text: lexeme, line: cursor.line, column: cursor.column });
    }
    cursor = end;
  }
  return tokens;
}

/**
 * Follows δ from q0 while there is a transition (maximal munch). Returns the state where it
 * stopped and the position of the first character it could not consume.
 */
function readLongestToken<
  State extends string,
  CharacterClass extends string,
  TokenKind extends string,
>(
  automaton: DeterministicAutomatonDefinition<State, CharacterClass, TokenKind>,
  text: string,
  tokenStart: Cursor,
  onEvent: ((event: AutomatonEvent<State, TokenKind>) => void) | undefined,
): Cursor & { state: State } {
  // This is δ̂ (the extended transition function) on the longest possible prefix:
  // it advances while δ(q, class(c)) exists. It never backtracks: no token of this
  // format needs to, so taking the longest one (maximal munch) is safe.
  let state = automaton.initialState;
  let cursor = tokenStart;
  for (;;) {
    const character = text[cursor.index];
    const next =
      character === undefined
        ? undefined
        : automaton.transitions[state][automaton.classifyCharacter(character)];
    if (character === undefined || next === undefined) {
      return { ...cursor, state };
    }
    onEvent?.({ type: 'transition', from: state, character, to: next });
    state = next;
    cursor = moveCursorPast(cursor, character);
  }
}

/**
 * The token kind of the state where a token ended. If the state does not accept (it is not
 * in F), or nothing was consumed, the text has no valid token here.
 */
function tokenKindOfFinalState<
  State extends string,
  CharacterClass extends string,
  TokenKind extends string,
>(
  automaton: DeterministicAutomatonDefinition<State, CharacterClass, TokenKind>,
  tokenStart: Cursor,
  end: Cursor & { state: State },
  blockingCharacter: string | undefined,
): TokenKind | null {
  // Accepting = ending in a state of F. If the state is not in F (for example q6,
  // an unclosed literal), the string read is not a token: it is a lexical error.
  const kind = automaton.acceptingStates[end.state];
  const consumedSomething = end.index > tokenStart.index;
  if (kind === undefined || !consumedSomething) {
    throw new AutomatonStoppedError(
      end.state,
      blockingCharacter,
      end.line,
      end.column,
      tokenStart.line,
      tokenStart.column,
    );
  }
  return kind;
}

/** Moves the cursor past one character, starting a new line after '\n'. */
function moveCursorPast(cursor: Cursor, character: string): Cursor {
  return character === '\n'
    ? { index: cursor.index + 1, line: cursor.line + 1, column: 1 }
    : { index: cursor.index + 1, line: cursor.line, column: cursor.column + 1 };
}
