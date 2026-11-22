// Texts for the .grammar lexer suite. Each case states what it demonstrates; the same cases
// are documented in docs/guides/03-lexer-afd.md, section "Suite de casos".

export interface ValidLexerCase {
  name: string;
  purpose: string;
  text: string;
  /** Each token as 'KIND text line:column' (the text is omitted when empty). */
  tokens: string[];
}

export interface ErrorLexerCase {
  name: string;
  purpose: string;
  text: string;
  /** The message without the position prefix. */
  message: string;
  line: number;
  column: number;
}

export const validLexerCases: ValidLexerCase[] = [
  {
    name: 'three-line example',
    purpose: 'a directive, two rules with an arrow, a literal, a bar and ε',
    text: "%start E\nE -> E '+' T | T\nT -> 'id' | ε\n",
    tokens: [
      'START %start 1:1',
      'IDENTIFIER E 1:8',
      'NEWLINE 1:9',
      'IDENTIFIER E 2:1',
      'ARROW -> 2:3',
      'IDENTIFIER E 2:6',
      'LITERAL + 2:8',
      'IDENTIFIER T 2:12',
      'BAR | 2:14',
      'IDENTIFIER T 2:16',
      'NEWLINE 2:17',
      'IDENTIFIER T 3:1',
      'ARROW -> 3:3',
      'LITERAL id 3:6',
      'BAR | 3:11',
      'EPSILON ε 3:13',
      'NEWLINE 3:14',
      'END_OF_FILE 4:1',
    ],
  },
  {
    name: 'unicode arrow',
    purpose: '→ is an ARROW in one step, like -> in two',
    text: 'S → a\n',
    tokens: [
      'IDENTIFIER S 1:1',
      'ARROW → 1:3',
      'IDENTIFIER a 1:5',
      'NEWLINE 1:6',
      'END_OF_FILE 2:1',
    ],
  },
  {
    name: 'missing final line break',
    purpose: 'a NEWLINE is added at the end, so the last rule also ends in NEWLINE',
    text: 'S -> a',
    tokens: [
      'IDENTIFIER S 1:1',
      'ARROW -> 1:3',
      'IDENTIFIER a 1:6',
      'NEWLINE 1:7',
      'END_OF_FILE 1:7',
    ],
  },
  {
    name: 'empty text',
    purpose: 'even an empty file ends in NEWLINE and END_OF_FILE',
    text: '',
    tokens: ['NEWLINE 1:1', 'END_OF_FILE 1:1'],
  },
  {
    name: 'comments and blank lines',
    purpose: 'comments are discarded, but their line break is still a NEWLINE',
    text: '# header\n\nS -> a # trailing comment\n',
    tokens: [
      'NEWLINE 1:9',
      'NEWLINE 2:1',
      'IDENTIFIER S 3:1',
      'ARROW -> 3:3',
      'IDENTIFIER a 3:6',
      'NEWLINE 3:26',
      'END_OF_FILE 4:1',
    ],
  },
  {
    name: 'maximal munch',
    purpose: 'Pistas is one identifier, not six; letters and digits continue it',
    text: 'Pistas2 G_1',
    tokens: ['IDENTIFIER Pistas2 1:1', 'IDENTIFIER G_1 1:9', 'NEWLINE 1:12', 'END_OF_FILE 1:12'],
  },
  {
    name: 'accented identifiers',
    purpose: 'accented letters are letters: Acción is one identifier',
    text: 'Acción -> Señal',
    tokens: [
      'IDENTIFIER Acción 1:1',
      'ARROW -> 1:8',
      'IDENTIFIER Señal 1:11',
      'NEWLINE 1:16',
      'END_OF_FILE 1:16',
    ],
  },
  {
    name: 'ε is not a letter',
    purpose: 'ε has its own class, so Aε is an identifier followed by EPSILON',
    text: 'Aε',
    tokens: ['IDENTIFIER A 1:1', 'EPSILON ε 1:2', 'NEWLINE 1:3', 'END_OF_FILE 1:3'],
  },
  {
    name: 'literal contents',
    purpose: 'anything but a quote or a line break fits in a literal; the token drops the quotes',
    text: "'->' '# not a comment' 'b c' ''",
    tokens: [
      'LITERAL -> 1:1',
      'LITERAL # not a comment 1:6',
      'LITERAL b c 1:24',
      'LITERAL 1:30',
      'NEWLINE 1:32',
      'END_OF_FILE 1:32',
    ],
  },
  {
    name: 'terminals directive',
    purpose: '%terminals is a TERMINALS token followed by the declared identifiers',
    text: '%terminals CRI REV\n',
    tokens: [
      'TERMINALS %terminals 1:1',
      'IDENTIFIER CRI 1:12',
      'IDENTIFIER REV 1:16',
      'NEWLINE 1:19',
      'END_OF_FILE 2:1',
    ],
  },
  {
    name: 'Windows line breaks',
    purpose: '\\r is a space, so \\r\\n files read the same as \\n files',
    text: 'S -> a\r\nA -> b\r\n',
    tokens: [
      'IDENTIFIER S 1:1',
      'ARROW -> 1:3',
      'IDENTIFIER a 1:6',
      'NEWLINE 1:8',
      'IDENTIFIER A 2:1',
      'ARROW -> 2:3',
      'IDENTIFIER b 2:6',
      'NEWLINE 2:8',
      'END_OF_FILE 3:1',
    ],
  },
  {
    name: 'tabs',
    purpose: 'a tab is a space',
    text: 'S\t->\ta',
    tokens: [
      'IDENTIFIER S 1:1',
      'ARROW -> 1:3',
      'IDENTIFIER a 1:6',
      'NEWLINE 1:7',
      'END_OF_FILE 1:7',
    ],
  },
];

export const errorLexerCases: ErrorLexerCase[] = [
  {
    name: 'unterminated literal',
    purpose: 'the automaton stops in q6 at the end of the text',
    text: "E -> '+",
    message: 'Unterminated literal: missing the closing quote',
    line: 1,
    column: 6,
  },
  {
    name: 'literal cut by a line break',
    purpose: 'a literal cannot span lines: q6 has no transition on newline; reported on line 3',
    text: "S -> a\nA -> b\nE -> 'x\n'",
    message: 'Unterminated literal: missing the closing quote',
    line: 3,
    column: 6,
  },
  {
    name: 'invalid character',
    purpose: 'q0 has no transition for the class other',
    text: 'E -> @',
    message: "Invalid character '@'",
    line: 1,
    column: 6,
  },
  {
    name: 'lone greater-than sign',
    purpose: '> only follows -: q0 has no transition on greater',
    text: 'E > T',
    message: "Invalid character '>'",
    line: 1,
    column: 3,
  },
  {
    name: 'identifier starting with a digit',
    purpose: 'q0 has no transition on digit: identifiers start with a letter',
    text: 'E -> 1a',
    message: "Invalid character '1'",
    line: 1,
    column: 6,
  },
  {
    name: 'lone hyphen',
    purpose: 'the automaton stops in q2 without the > of the arrow',
    text: 'E - T',
    message: "Expected '>' after '-'",
    line: 1,
    column: 3,
  },
  {
    name: 'percent without a name',
    purpose: 'the automaton stops in q8: % must be followed by a letter',
    text: '% start E',
    message: "Expected a directive name after '%'",
    line: 1,
    column: 1,
  },
  {
    name: 'unknown directive',
    purpose: 'q9 accepts %inicio, but it is not one of the reserved words',
    text: 'E -> a\n%inicio E',
    message: 'Unknown directive "%inicio": expected %start or %terminals',
    line: 2,
    column: 1,
  },
];
