/**
 * Concept: predictive recursive-descent parser for an LL(1) grammar (meta.grammar), one
 * function per nonterminal, each choosing its alternative by looking at one token.
 * Reference: Aho, Lam, Sethi and Ullman, Compilers (2nd ed.), 4.4.
 * Card: docs/concepts/04-predictive-recursive-descent-parser.md
 *
 * The grammar of the .grammar format (meta.grammar), whose terminals are the token kinds:
 *
 *   File             -> Element File | END_OF_FILE
 *   Element          -> NEWLINE | Directive | Rule
 *   Directive        -> START IDENTIFIER NEWLINE | TERMINALS Symbols NEWLINE
 *   Rule             -> IDENTIFIER ARROW Alternatives NEWLINE
 *   Alternatives     -> Sequence MoreAlternatives
 *   MoreAlternatives -> BAR Sequence MoreAlternatives | ε
 *   Sequence         -> EPSILON | Symbols
 *   Symbols          -> Symbol Symbols | ε
 *   Symbol           -> IDENTIFIER | LITERAL
 */
import { buildGrammar, type GrammarRule, type RightSideSymbol } from '../grammar/build.js';
import type { Grammar, SymbolName } from '../grammar/types.js';
import { GrammarSyntaxError, tokenizeGrammar, type Token, type TokenKind } from './lexer.js';

/** What a .grammar file says, before building the grammar from it. */
export interface ParsedGrammarFile {
  rules: GrammarRule[];
  /** The %start directive, if the file has one. */
  start: SymbolName | undefined;
  /** The %terminals directive, if the file has one. */
  declaredTerminals: SymbolName[] | undefined;
}

/** One decision of the parser: which alternative a nonterminal chose, and why. */
export interface ParserTraceStep {
  /** How deep the call is: File is 0, the functions it calls are 1, and so on. */
  depth: number;
  nonterminal: string;
  /** The lookahead token that decided the alternative. */
  lookahead: Token;
  /** The chosen right-hand side, as in meta.grammar ('Symbol Symbols', 'ε'). */
  alternative: string;
}

/**
 * Reads a .grammar text and builds its grammar: lexer (DFA) → parser (LL(1)) → buildGrammar.
 * Throws GrammarSyntaxError for lexical and syntax errors, GrammarBuildError for invalid
 * grammars (an undeclared symbol, a duplicate production…).
 */
export function parseGrammarText({
  text,
  name,
  onTrace,
}: {
  /** The content of the .grammar file. */
  text: string;
  /** The name of the grammar, shown in the output and in errors. */
  name: string;
  /** Called on each decision of the parser (the --trace of the grammar command). */
  onTrace?: ((step: ParserTraceStep) => void) | undefined;
}): Grammar {
  // The whole reading pipeline: text → (DFA, regular language) → tokens →
  // (LL(1), context-free) → rules → (buildGrammar) → G = (N, Σ, P, S).
  const file = parseGrammarFile({ tokens: tokenizeGrammar({ text }), onTrace });
  return buildGrammar({
    name,
    rules: file.rules,
    start: file.start,
    declaredTerminals: file.declaredTerminals,
  });
}

/** Parses the tokens of a .grammar file, starting at File, the start symbol of meta.grammar. */
export function parseGrammarFile({
  tokens,
  onTrace,
}: {
  tokens: readonly Token[];
  onTrace?: ((step: ParserTraceStep) => void) | undefined;
}): ParsedGrammarFile {
  return new GrammarFileParser({ tokens, onTrace }).parseFile();
}

/** FIRST(Symbols) ∪ FOLLOW(Symbols): the tokens that can start or end a sequence of symbols. */
const symbolsOrSequenceEnd: readonly TokenKind[] = ['IDENTIFIER', 'LITERAL', 'BAR', 'NEWLINE'];

/** How each token kind is called in error messages. */
const tokenDescriptions: Record<TokenKind, string> = {
  IDENTIFIER: 'a name',
  LITERAL: 'a quoted literal',
  ARROW: "'->'",
  BAR: "'|'",
  EPSILON: "'ε'",
  NEWLINE: 'the end of the line',
  START: '%start',
  TERMINALS: '%terminals',
  END_OF_FILE: 'the end of the file',
};

/**
 * The recursive-descent parser. Each parse… method is one nonterminal of meta.grammar: it
 * looks at the current token (the lookahead), picks the only alternative that can start
 * with it, and calls the methods of the symbols of that alternative, in order.
 */
// Predictive top-down parsing: the leftmost derivation is built from the top
// (File) down, and at each nonterminal the production is chosen by looking at ONE token.
// It works without backtracking because meta.grammar is LL(1): for each nonterminal, the
// predict sets of its alternatives (FIRST, or FOLLOW if they derive ε) are disjoint.
// The stack of the equivalent pushdown automaton is the call stack of these methods.
class GrammarFileParser {
  private position = 0;
  private depth = 0;
  private readonly file: ParsedGrammarFile = {
    rules: [],
    start: undefined,
    declaredTerminals: undefined,
  };

  private readonly tokens: readonly Token[];
  private readonly onTrace: ((step: ParserTraceStep) => void) | undefined;

  constructor({
    tokens,
    onTrace,
  }: {
    tokens: readonly Token[];
    onTrace?: ((step: ParserTraceStep) => void) | undefined;
  }) {
    this.tokens = tokens;
    this.onTrace = onTrace;
  }

  /** File -> Element File | END_OF_FILE */
  parseFile(): ParsedGrammarFile {
    if (this.lookahead().kind === 'END_OF_FILE') {
      this.trace({ nonterminal: 'File', alternative: 'END_OF_FILE' });
      return this.file;
    }
    this.trace({ nonterminal: 'File', alternative: 'Element File' });
    this.nested(() => this.parseElement());
    return this.parseFile();
  }

  /** Element -> NEWLINE | Directive | Rule */
  private parseElement(): void {
    switch (this.lookahead().kind) {
      case 'NEWLINE':
        this.trace({ nonterminal: 'Element', alternative: 'NEWLINE' });
        this.expect('NEWLINE');
        return;
      case 'START':
      case 'TERMINALS':
        this.trace({ nonterminal: 'Element', alternative: 'Directive' });
        this.nested(() => this.parseDirective());
        return;
      case 'IDENTIFIER':
        this.trace({ nonterminal: 'Element', alternative: 'Rule' });
        this.nested(() => this.parseRule());
        return;
      default:
        throw this.unexpected(['IDENTIFIER', 'START', 'TERMINALS', 'NEWLINE']);
    }
  }

  /** Directive -> START IDENTIFIER NEWLINE | TERMINALS Symbols NEWLINE */
  private parseDirective(): void {
    const directive = this.lookahead();
    if (directive.kind === 'START') {
      this.trace({ nonterminal: 'Directive', alternative: 'START IDENTIFIER NEWLINE' });
      this.expect('START');
      const start = this.expect('IDENTIFIER').text;
      this.expect('NEWLINE');
      this.file.start = this.onlyOnce({ directive, previous: this.file.start, value: start });
      return;
    }
    this.trace({ nonterminal: 'Directive', alternative: 'TERMINALS Symbols NEWLINE' });
    this.expect('TERMINALS');
    const terminals = this.nested(() => this.parseSymbols()).map(symbolName);
    this.expect('NEWLINE');
    this.file.declaredTerminals = this.onlyOnce({
      directive,
      previous: this.file.declaredTerminals,
      value: terminals,
    });
  }

  /** Rule -> IDENTIFIER ARROW Alternatives NEWLINE. Each alternative is one production. */
  private parseRule(): void {
    this.trace({ nonterminal: 'Rule', alternative: 'IDENTIFIER ARROW Alternatives NEWLINE' });
    const leftSide = this.expect('IDENTIFIER').text;
    this.expect('ARROW');
    const alternatives = this.nested(() => this.parseAlternatives());
    this.expect('NEWLINE');
    for (const rightSide of alternatives) {
      this.file.rules.push({ leftSide, rightSide });
    }
  }

  /** Alternatives -> Sequence MoreAlternatives */
  private parseAlternatives(): RightSideSymbol[][] {
    this.trace({ nonterminal: 'Alternatives', alternative: 'Sequence MoreAlternatives' });
    const first = this.nested(() => this.parseSequence());
    const rest = this.nested(() => this.parseMoreAlternatives());
    return [first, ...rest];
  }

  /** MoreAlternatives -> BAR Sequence MoreAlternatives | ε */
  private parseMoreAlternatives(): RightSideSymbol[][] {
    const kind = this.lookahead().kind;
    if (kind === 'NEWLINE') {
      // ε is chosen when the lookahead is in FOLLOW(MoreAlternatives) = {NEWLINE}.
      this.trace({ nonterminal: 'MoreAlternatives', alternative: 'ε' });
      return [];
    }
    if (kind !== 'BAR') {
      throw this.unexpected(['BAR', 'NEWLINE']);
    }
    this.trace({ nonterminal: 'MoreAlternatives', alternative: 'BAR Sequence MoreAlternatives' });
    this.expect('BAR');
    const sequence = this.nested(() => this.parseSequence());
    const rest = this.nested(() => this.parseMoreAlternatives());
    return [sequence, ...rest];
  }

  /** Sequence -> EPSILON | Symbols. Both give an empty right side when there are no symbols. */
  private parseSequence(): RightSideSymbol[] {
    const kind = this.lookahead().kind;
    if (kind === 'EPSILON') {
      this.trace({ nonterminal: 'Sequence', alternative: 'EPSILON' });
      this.expect('EPSILON');
      return [];
    }
    // Symbols is chosen on FIRST(Symbols) ∪ FOLLOW(Sequence) = {IDENTIFIER, LITERAL, BAR, NEWLINE}.
    if (!symbolsOrSequenceEnd.includes(kind)) {
      throw this.unexpected(['EPSILON', ...symbolsOrSequenceEnd]);
    }
    this.trace({ nonterminal: 'Sequence', alternative: 'Symbols' });
    return this.nested(() => this.parseSymbols());
  }

  /** Symbols -> Symbol Symbols | ε */
  private parseSymbols(): RightSideSymbol[] {
    // The key LL(1) case with ε: "Symbols → ε" is chosen only if the next token can
    // come AFTER Symbols (FOLLOW = {BAR, NEWLINE}). If it is in neither FIRST nor
    // FOLLOW, the error is caught right here and the message lists both sets.
    const kind = this.lookahead().kind;
    if (kind === 'BAR' || kind === 'NEWLINE') {
      // ε is chosen when the lookahead is in FOLLOW(Symbols) = {BAR, NEWLINE}.
      this.trace({ nonterminal: 'Symbols', alternative: 'ε' });
      return [];
    }
    if (kind !== 'IDENTIFIER' && kind !== 'LITERAL') {
      throw this.unexpected(symbolsOrSequenceEnd);
    }
    this.trace({ nonterminal: 'Symbols', alternative: 'Symbol Symbols' });
    const symbol = this.nested(() => this.parseSymbol());
    const rest = this.nested(() => this.parseSymbols());
    return [symbol, ...rest];
  }

  /** Symbol -> IDENTIFIER | LITERAL */
  private parseSymbol(): RightSideSymbol {
    const token = this.lookahead();
    if (token.kind === 'LITERAL') {
      this.trace({ nonterminal: 'Symbol', alternative: 'LITERAL' });
      this.expect('LITERAL');
      return { literal: token.text };
    }
    this.trace({ nonterminal: 'Symbol', alternative: 'IDENTIFIER' });
    return this.expect('IDENTIFIER').text;
  }

  /** The current token. The lexer always ends with END_OF_FILE, so there is always one. */
  private lookahead(): Token {
    const token = this.tokens[this.position] ?? this.tokens.at(-1);
    if (token === undefined) {
      throw new Error('The token list is empty: it must end with END_OF_FILE');
    }
    return token;
  }

  /** Consumes the lookahead if it has the given kind; otherwise it is a syntax error. */
  private expect(kind: TokenKind): Token {
    // This is "matching" a terminal: in the pushdown automaton, pop the terminal from the
    // top and advance the input. If it does not match, the string is not in L(meta.grammar).
    const token = this.lookahead();
    if (token.kind !== kind) {
      throw this.unexpected([kind]);
    }
    this.position++;
    return token;
  }

  /** The syntax error at the lookahead: 'Expected X or Y, but found Z', with its position. */
  private unexpected(expected: readonly TokenKind[]): GrammarSyntaxError {
    const found = this.lookahead();
    const options = listWithOr(expected.map((kind) => tokenDescriptions[kind]));
    return new GrammarSyntaxError({
      message: `Expected ${options}, but found ${describeToken(found)}`,
      line: found.line,
      column: found.column,
    });
  }

  /** %start and %terminals may appear at most once: a second one would silently win. */
  private onlyOnce<T>({
    directive,
    previous,
    value,
  }: {
    directive: Token;
    /** The value of the directive if it already appeared. */
    previous: T | undefined;
    value: T;
  }): T {
    if (previous !== undefined) {
      throw new GrammarSyntaxError({
        message: `${directive.text} appears more than once`,
        line: directive.line,
        column: directive.column,
      });
    }
    return value;
  }

  /** Runs a call one level deeper, so the trace shows the recursion. */
  private nested<T>(parse: () => T): T {
    this.depth++;
    try {
      return parse();
    } finally {
      this.depth--;
    }
  }

  /** Reports one decision of the parser to the trace observer, if there is one. */
  private trace({ nonterminal, alternative }: { nonterminal: string; alternative: string }): void {
    this.onTrace?.({ depth: this.depth, nonterminal, lookahead: this.lookahead(), alternative });
  }
}

/** 'a, b or c'. */
function listWithOr(items: readonly string[]): string {
  return items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} or ${items.at(-1) ?? ''}`;
}

/** How a token is named in an error: 'a name ("Pistas")', 'the end of the line'… */
function describeToken(token: Token): string {
  const description = tokenDescriptions[token.kind];
  return token.kind === 'IDENTIFIER' || token.kind === 'LITERAL'
    ? `${description} ("${token.text}")`
    : description;
}

/** The name of a symbol: the identifier itself, or the content of a literal. */
function symbolName(symbol: RightSideSymbol): SymbolName {
  return typeof symbol === 'string' ? symbol : symbol.literal;
}
