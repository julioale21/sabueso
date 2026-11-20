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
export function parseGrammarText(
  text: string,
  name: string,
  onTrace?: (step: ParserTraceStep) => void,
): Grammar {
  // ES: La cadena completa de lectura: texto → (AFD, lenguaje regular) → tokens →
  // ES: (LL(1), libre de contexto) → reglas → (buildGrammar) → G = (N, Σ, P, S).
  const file = parseGrammarFile(tokenizeGrammar(text), onTrace);
  return buildGrammar(name, file.rules, file.start, file.declaredTerminals);
}

/** Parses the tokens of a .grammar file, starting at File, the start symbol of meta.grammar. */
export function parseGrammarFile(
  tokens: readonly Token[],
  onTrace?: (step: ParserTraceStep) => void,
): ParsedGrammarFile {
  return new GrammarFileParser(tokens, onTrace).parseFile();
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
// ES: Análisis descendente predictivo: la derivación más a la izquierda se arma de arriba
// ES: (File) hacia abajo, y en cada no terminal se elige la producción mirando UN token.
// ES: Funciona sin retroceso porque meta.grammar es LL(1): para cada no terminal, los
// ES: conjuntos de predicción de sus alternativas (FIRST, o FOLLOW si derivan ε) son disjuntos.
// ES: La pila del autómata de pila equivalente es la pila de llamadas de estos métodos.
class GrammarFileParser {
  private position = 0;
  private depth = 0;
  private readonly file: ParsedGrammarFile = {
    rules: [],
    start: undefined,
    declaredTerminals: undefined,
  };

  constructor(
    private readonly tokens: readonly Token[],
    private readonly onTrace: ((step: ParserTraceStep) => void) | undefined,
  ) {}

  /** File -> Element File | END_OF_FILE */
  parseFile(): ParsedGrammarFile {
    if (this.lookahead().kind === 'END_OF_FILE') {
      this.trace('File', 'END_OF_FILE');
      return this.file;
    }
    this.trace('File', 'Element File');
    this.nested(() => this.parseElement());
    return this.parseFile();
  }

  /** Element -> NEWLINE | Directive | Rule */
  private parseElement(): void {
    switch (this.lookahead().kind) {
      case 'NEWLINE':
        this.trace('Element', 'NEWLINE');
        this.expect('NEWLINE');
        return;
      case 'START':
      case 'TERMINALS':
        this.trace('Element', 'Directive');
        this.nested(() => this.parseDirective());
        return;
      case 'IDENTIFIER':
        this.trace('Element', 'Rule');
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
      this.trace('Directive', 'START IDENTIFIER NEWLINE');
      this.expect('START');
      const start = this.expect('IDENTIFIER').text;
      this.expect('NEWLINE');
      this.file.start = this.onlyOnce(directive, this.file.start, start);
      return;
    }
    this.trace('Directive', 'TERMINALS Symbols NEWLINE');
    this.expect('TERMINALS');
    const terminals = this.nested(() => this.parseSymbols()).map(symbolName);
    this.expect('NEWLINE');
    this.file.declaredTerminals = this.onlyOnce(directive, this.file.declaredTerminals, terminals);
  }

  /** Rule -> IDENTIFIER ARROW Alternatives NEWLINE. Each alternative is one production. */
  private parseRule(): void {
    this.trace('Rule', 'IDENTIFIER ARROW Alternatives NEWLINE');
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
    this.trace('Alternatives', 'Sequence MoreAlternatives');
    const first = this.nested(() => this.parseSequence());
    const rest = this.nested(() => this.parseMoreAlternatives());
    return [first, ...rest];
  }

  /** MoreAlternatives -> BAR Sequence MoreAlternatives | ε */
  private parseMoreAlternatives(): RightSideSymbol[][] {
    const kind = this.lookahead().kind;
    if (kind === 'NEWLINE') {
      // ε is chosen when the lookahead is in FOLLOW(MoreAlternatives) = {NEWLINE}.
      this.trace('MoreAlternatives', 'ε');
      return [];
    }
    if (kind !== 'BAR') {
      throw this.unexpected(['BAR', 'NEWLINE']);
    }
    this.trace('MoreAlternatives', 'BAR Sequence MoreAlternatives');
    this.expect('BAR');
    const sequence = this.nested(() => this.parseSequence());
    const rest = this.nested(() => this.parseMoreAlternatives());
    return [sequence, ...rest];
  }

  /** Sequence -> EPSILON | Symbols. Both give an empty right side when there are no symbols. */
  private parseSequence(): RightSideSymbol[] {
    const kind = this.lookahead().kind;
    if (kind === 'EPSILON') {
      this.trace('Sequence', 'EPSILON');
      this.expect('EPSILON');
      return [];
    }
    // Symbols is chosen on FIRST(Symbols) ∪ FOLLOW(Sequence) = {IDENTIFIER, LITERAL, BAR, NEWLINE}.
    if (!symbolsOrSequenceEnd.includes(kind)) {
      throw this.unexpected(['EPSILON', ...symbolsOrSequenceEnd]);
    }
    this.trace('Sequence', 'Symbols');
    return this.nested(() => this.parseSymbols());
  }

  /** Symbols -> Symbol Symbols | ε */
  private parseSymbols(): RightSideSymbol[] {
    // ES: El caso clave de LL(1) con ε: se elige "Symbols → ε" solo si el token siguiente
    // ES: puede venir DESPUÉS de Symbols (FOLLOW = {BAR, NEWLINE}). Si no está ni en FIRST ni
    // ES: en FOLLOW, el error se detecta acá mismo y el mensaje lista ambos conjuntos.
    const kind = this.lookahead().kind;
    if (kind === 'BAR' || kind === 'NEWLINE') {
      // ε is chosen when the lookahead is in FOLLOW(Symbols) = {BAR, NEWLINE}.
      this.trace('Symbols', 'ε');
      return [];
    }
    if (kind !== 'IDENTIFIER' && kind !== 'LITERAL') {
      throw this.unexpected(symbolsOrSequenceEnd);
    }
    this.trace('Symbols', 'Symbol Symbols');
    const symbol = this.nested(() => this.parseSymbol());
    const rest = this.nested(() => this.parseSymbols());
    return [symbol, ...rest];
  }

  /** Symbol -> IDENTIFIER | LITERAL */
  private parseSymbol(): RightSideSymbol {
    const token = this.lookahead();
    if (token.kind === 'LITERAL') {
      this.trace('Symbol', 'LITERAL');
      this.expect('LITERAL');
      return { literal: token.text };
    }
    this.trace('Symbol', 'IDENTIFIER');
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
    // ES: Equivale a "emparejar" un terminal: en el autómata de pila, sacar el terminal del
    // ES: tope y avanzar en la entrada. Si no coincide, la cadena no está en L(meta.grammar).
    const token = this.lookahead();
    if (token.kind !== kind) {
      throw this.unexpected([kind]);
    }
    this.position++;
    return token;
  }

  private unexpected(expected: readonly TokenKind[]): GrammarSyntaxError {
    const found = this.lookahead();
    const options = listWithOr(expected.map((kind) => tokenDescriptions[kind]));
    return new GrammarSyntaxError(
      `Expected ${options}, but found ${describeToken(found)}`,
      found.line,
      found.column,
    );
  }

  /** %start and %terminals may appear at most once: a second one would silently win. */
  private onlyOnce<T>(directive: Token, previous: T | undefined, value: T): T {
    if (previous !== undefined) {
      throw new GrammarSyntaxError(
        `${directive.text} appears more than once`,
        directive.line,
        directive.column,
      );
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

  private trace(nonterminal: string, alternative: string): void {
    this.onTrace?.({ depth: this.depth, nonterminal, lookahead: this.lookahead(), alternative });
  }
}

/** 'a, b or c'. */
function listWithOr(items: readonly string[]): string {
  return items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} or ${items.at(-1) ?? ''}`;
}

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
