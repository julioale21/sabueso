/**
 * Concept: predictive recursive-descent parser for an LL(1) grammar (meta.grammar), one
 * function per nonterminal, each choosing its alternative by looking at one token.
 * Guide: docs/guides/04-parser-ll1.md
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
  /** Every decision of the parser, in order (the --trace of the grammar command). */
  trace: ParserTraceStep[];
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
}: {
  /** The content of the .grammar file. */
  text: string;
  /** The name of the grammar, shown in the output and in errors. */
  name: string;
}): Grammar {
  // The whole reading pipeline: text → (DFA, regular language) → tokens →
  // (LL(1), context-free) → rules → (buildGrammar) → G = (N, Σ, P, S).
  const file = parseGrammarFile(tokenizeGrammar(text));
  return buildGrammar({
    name,
    rules: file.rules,
    start: file.start,
    declaredTerminals: file.declaredTerminals,
  });
}

/**
 * Parses the tokens of a .grammar file, starting at File, the start symbol of meta.grammar.
 * The result also holds every decision of the parser, in `trace`.
 */
export function parseGrammarFile(tokens: readonly Token[]): ParsedGrammarFile {
  return new GrammarFileParser(tokens).parseFile(0);
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
  private readonly file: ParsedGrammarFile = {
    rules: [],
    start: undefined,
    declaredTerminals: undefined,
    trace: [],
  };

  private readonly tokens: readonly Token[];

  constructor(tokens: readonly Token[]) {
    this.tokens = tokens;
  }

  /** File -> Element File | END_OF_FILE */
  parseFile(depth: number): ParsedGrammarFile {
    if (this.lookahead().kind === 'END_OF_FILE') {
      this.record({ depth, nonterminal: 'File', alternative: 'END_OF_FILE' });
      return this.file;
    }
    this.record({ depth, nonterminal: 'File', alternative: 'Element File' });
    this.parseElement(depth + 1);
    return this.parseFile(depth);
  }

  /** Element -> NEWLINE | Directive | Rule */
  private parseElement(depth: number): void {
    switch (this.lookahead().kind) {
      case 'NEWLINE':
        this.record({ depth, nonterminal: 'Element', alternative: 'NEWLINE' });
        this.expect('NEWLINE');
        return;
      case 'START':
      case 'TERMINALS':
        this.record({ depth, nonterminal: 'Element', alternative: 'Directive' });
        this.parseDirective(depth + 1);
        return;
      case 'IDENTIFIER':
        this.record({ depth, nonterminal: 'Element', alternative: 'Rule' });
        this.parseRule(depth + 1);
        return;
      default:
        throw this.unexpected(['IDENTIFIER', 'START', 'TERMINALS', 'NEWLINE']);
    }
  }

  /** Directive -> START IDENTIFIER NEWLINE | TERMINALS Symbols NEWLINE */
  private parseDirective(depth: number): void {
    const directive = this.lookahead();
    if (directive.kind === 'START') {
      this.record({ depth, nonterminal: 'Directive', alternative: 'START IDENTIFIER NEWLINE' });
      this.expect('START');
      const start = this.expect('IDENTIFIER').text;
      this.expect('NEWLINE');
      this.file.start = this.onlyOnce({ directive, previous: this.file.start, value: start });
      return;
    }
    this.record({ depth, nonterminal: 'Directive', alternative: 'TERMINALS Symbols NEWLINE' });
    this.expect('TERMINALS');
    const terminals = this.parseSymbols(depth + 1).map(symbolName);
    this.expect('NEWLINE');
    this.file.declaredTerminals = this.onlyOnce({
      directive,
      previous: this.file.declaredTerminals,
      value: terminals,
    });
  }

  /** Rule -> IDENTIFIER ARROW Alternatives NEWLINE. Each alternative is one production. */
  private parseRule(depth: number): void {
    this.record({
      depth,
      nonterminal: 'Rule',
      alternative: 'IDENTIFIER ARROW Alternatives NEWLINE',
    });
    const leftSide = this.expect('IDENTIFIER').text;
    this.expect('ARROW');
    const alternatives = this.parseAlternatives(depth + 1);
    this.expect('NEWLINE');
    for (const rightSide of alternatives) {
      this.file.rules.push({ leftSide, rightSide });
    }
  }

  /** Alternatives -> Sequence MoreAlternatives */
  private parseAlternatives(depth: number): RightSideSymbol[][] {
    this.record({ depth, nonterminal: 'Alternatives', alternative: 'Sequence MoreAlternatives' });
    const first = this.parseSequence(depth + 1);
    const rest = this.parseMoreAlternatives(depth + 1);
    return [first, ...rest];
  }

  /** MoreAlternatives -> BAR Sequence MoreAlternatives | ε */
  private parseMoreAlternatives(depth: number): RightSideSymbol[][] {
    const kind = this.lookahead().kind;
    if (kind === 'NEWLINE') {
      // ε is chosen when the lookahead is in FOLLOW(MoreAlternatives) = {NEWLINE}.
      this.record({ depth, nonterminal: 'MoreAlternatives', alternative: 'ε' });
      return [];
    }
    if (kind !== 'BAR') {
      throw this.unexpected(['BAR', 'NEWLINE']);
    }
    this.record({
      depth,
      nonterminal: 'MoreAlternatives',
      alternative: 'BAR Sequence MoreAlternatives',
    });
    this.expect('BAR');
    const sequence = this.parseSequence(depth + 1);
    const rest = this.parseMoreAlternatives(depth + 1);
    return [sequence, ...rest];
  }

  /** Sequence -> EPSILON | Symbols. Both give an empty right side when there are no symbols. */
  private parseSequence(depth: number): RightSideSymbol[] {
    const kind = this.lookahead().kind;
    if (kind === 'EPSILON') {
      this.record({ depth, nonterminal: 'Sequence', alternative: 'EPSILON' });
      this.expect('EPSILON');
      return [];
    }
    // Symbols is chosen on FIRST(Symbols) ∪ FOLLOW(Sequence) = {IDENTIFIER, LITERAL, BAR, NEWLINE}.
    if (!symbolsOrSequenceEnd.includes(kind)) {
      throw this.unexpected(['EPSILON', ...symbolsOrSequenceEnd]);
    }
    this.record({ depth, nonterminal: 'Sequence', alternative: 'Symbols' });
    return this.parseSymbols(depth + 1);
  }

  /** Symbols -> Symbol Symbols | ε */
  private parseSymbols(depth: number): RightSideSymbol[] {
    // The key LL(1) case with ε: "Symbols → ε" is chosen only if the next token can
    // come AFTER Symbols (FOLLOW = {BAR, NEWLINE}). If it is in neither FIRST nor
    // FOLLOW, the error is caught right here and the message lists both sets.
    const kind = this.lookahead().kind;
    if (kind === 'BAR' || kind === 'NEWLINE') {
      // ε is chosen when the lookahead is in FOLLOW(Symbols) = {BAR, NEWLINE}.
      this.record({ depth, nonterminal: 'Symbols', alternative: 'ε' });
      return [];
    }
    if (kind !== 'IDENTIFIER' && kind !== 'LITERAL') {
      throw this.unexpected(symbolsOrSequenceEnd);
    }
    this.record({ depth, nonterminal: 'Symbols', alternative: 'Symbol Symbols' });
    const symbol = this.parseSymbol(depth + 1);
    const rest = this.parseSymbols(depth + 1);
    return [symbol, ...rest];
  }

  /** Symbol -> IDENTIFIER | LITERAL */
  private parseSymbol(depth: number): RightSideSymbol {
    const token = this.lookahead();
    if (token.kind === 'LITERAL') {
      this.record({ depth, nonterminal: 'Symbol', alternative: 'LITERAL' });
      this.expect('LITERAL');
      return { literal: token.text };
    }
    this.record({ depth, nonterminal: 'Symbol', alternative: 'IDENTIFIER' });
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

  /** Records one decision of the parser in the trace of the result. */
  private record({
    depth,
    nonterminal,
    alternative,
  }: {
    /** How deep the call is: File is 0, and each call goes one level deeper. */
    depth: number;
    nonterminal: string;
    alternative: string;
  }): void {
    this.file.trace.push({ depth, nonterminal, lookahead: this.lookahead(), alternative });
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
