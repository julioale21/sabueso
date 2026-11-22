// Texts for the .grammar parser suite. Each case states what it demonstrates; the same cases
// are documented in docs/guides/04-parser-ll1.md, "Suite de casos".

export interface ValidParserCase {
  name: string;
  purpose: string;
  text: string;
  start: string;
  /** Σ, in the order of the grammar (declared terminals first). */
  terminals: string[];
  /** P, formatted. */
  productions: string[];
}

export interface ErrorParserCase {
  name: string;
  purpose: string;
  text: string;
  /** 'syntax' errors have a position; 'build' errors come from buildGrammar. */
  kind: 'syntax' | 'build';
  /** The message, without the position prefix of syntax errors. */
  message: string;
  line?: number;
  column?: number;
}

export const validParserCases: ValidParserCase[] = [
  {
    name: 'one rule, one alternative',
    purpose: 'Rule -> IDENTIFIER ARROW Alternatives NEWLINE with a single sequence',
    text: 'S -> a b\n',
    start: 'S',
    terminals: ['a', 'b'],
    productions: ['S → a b'],
  },
  {
    name: 'alternatives',
    purpose: 'each alternative after | is one more production with the same left side',
    text: "E -> E '+' T | T\nT -> 'id'\n",
    start: 'E',
    terminals: ['+', 'id'],
    productions: ['E → E + T', 'E → T', 'T → id'],
  },
  {
    name: 'ε written explicitly',
    purpose: 'Sequence -> EPSILON gives an empty right side',
    text: "S -> '(' S ')' S | ε\n",
    start: 'S',
    terminals: ['(', ')'],
    productions: ['S → ( S ) S', 'S → ε'],
  },
  {
    name: 'ε as an empty alternative',
    purpose: 'Sequence -> Symbols -> ε: an empty alternative is also ε',
    text: "S -> 'a' S |\n",
    start: 'S',
    terminals: ['a'],
    productions: ['S → a S', 'S → ε'],
  },
  {
    name: 'directives',
    purpose: '%start overrides the first rule; %terminals declares Σ, even unused symbols',
    text: '%start Relato\n%terminals CRI PIS REV EPI\nPistas -> PIS Pistas | PIS\nRelato -> CRI Pistas REV\n',
    start: 'Relato',
    terminals: ['CRI', 'PIS', 'REV', 'EPI'],
    productions: ['Pistas → PIS Pistas', 'Pistas → PIS', 'Relato → CRI Pistas REV'],
  },
  {
    name: 'comments, blank lines and both arrows',
    purpose: 'Element -> NEWLINE skips blank and comment lines; -> and → are the same ARROW',
    text: '# header\n\nS -> A # trailing comment\n\nA → a\n',
    start: 'S',
    terminals: ['a'],
    productions: ['S → A', 'A → a'],
  },
  {
    name: 'no final line break',
    purpose: 'the NEWLINE added by the lexer lets the last rule end',
    text: 'S -> a',
    start: 'S',
    terminals: ['a'],
    productions: ['S → a'],
  },
  {
    name: 'literal declared in %terminals',
    purpose: 'a literal in %terminals declares the terminal named by its content',
    text: "%terminals 'if' x\nS -> 'if' x\n",
    start: 'S',
    terminals: ['if', 'x'],
    productions: ['S → if x'],
  },
];

export const errorParserCases: ErrorParserCase[] = [
  {
    name: 'missing arrow',
    purpose: 'Rule expects ARROW after the left side',
    text: 'S a\n',
    kind: 'syntax',
    message: 'Expected \'->\', but found a name ("a")',
    line: 1,
    column: 3,
  },
  {
    name: 'line starting with an arrow',
    purpose: 'Element has no alternative for ARROW: the message lists FIRST(Element)',
    text: 'S -> a\n-> b\n',
    kind: 'syntax',
    message: "Expected a name, %start, %terminals or the end of the line, but found '->'",
    line: 2,
    column: 1,
  },
  {
    name: 'symbol after ε',
    purpose: 'after EPSILON only | or the end of the line can follow (FOLLOW(Sequence))',
    text: 'S -> ε a\n',
    kind: 'syntax',
    message: 'Expected \'|\' or the end of the line, but found a name ("a")',
    line: 1,
    column: 8,
  },
  {
    name: 'ε after symbols',
    purpose: 'Symbols accepts IDENTIFIER, LITERAL or its FOLLOW {BAR, NEWLINE}, not EPSILON',
    text: 'S -> a ε\n',
    kind: 'syntax',
    message: "Expected a name, a quoted literal, '|' or the end of the line, but found 'ε'",
    line: 1,
    column: 8,
  },
  {
    name: 'two arrows',
    purpose: 'Sequence cannot start with ARROW: the message lists every token it accepts',
    text: 'S -> -> a\n',
    kind: 'syntax',
    message: "Expected 'ε', a name, a quoted literal, '|' or the end of the line, but found '->'",
    line: 1,
    column: 6,
  },
  {
    name: '%start without a name',
    purpose: 'Directive -> START IDENTIFIER NEWLINE',
    text: '%start\nS -> a\n',
    kind: 'syntax',
    message: 'Expected a name, but found the end of the line',
    line: 1,
    column: 7,
  },
  {
    name: '%start with two names',
    purpose: 'only one start symbol: after the name the line must end',
    text: '%start S T\nS -> a\n',
    kind: 'syntax',
    message: 'Expected the end of the line, but found a name ("T")',
    line: 1,
    column: 10,
  },
  {
    name: 'repeated %start',
    purpose: 'a second %start would silently replace the first',
    text: '%start S\n%start T\nS -> a\nT -> b\n',
    kind: 'syntax',
    message: '%start appears more than once',
    line: 2,
    column: 1,
  },
  {
    name: 'repeated %terminals',
    purpose: 'a second %terminals would silently replace the first',
    text: '%terminals a\n%terminals b\nS -> a b\n',
    kind: 'syntax',
    message: '%terminals appears more than once',
    line: 2,
    column: 1,
  },
  {
    name: 'lexical error',
    purpose: 'errors of the lexer (the DFA) come out of the same function',
    text: "S -> a\nT -> 'b\n",
    kind: 'syntax',
    message: 'Unterminated literal: missing the closing quote',
    line: 2,
    column: 6,
  },
  {
    name: 'well-formed but invalid grammar',
    purpose: 'the syntax is right, but buildGrammar rejects an undeclared symbol',
    text: '%terminals a\nS -> a b\n',
    kind: 'build',
    message:
      'Undeclared symbol "b": it is not the left-hand side of any rule and is not listed in %terminals',
  },
  {
    name: 'empty file',
    purpose: 'File -> END_OF_FILE is valid syntax, but a grammar needs at least one rule',
    text: '# nothing here\n',
    kind: 'build',
    message: 'Grammar "test" has no rules',
  },
];
