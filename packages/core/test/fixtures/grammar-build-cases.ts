// Grammars for the buildGrammar suite. Each case states what it demonstrates; the same
// cases are documented in docs/guides/02-grammar-construction.md, section "Suite de casos".
import type { GrammarRule, RightSideSymbol } from '../../src/grammar/build.js';

/** A literal as written in a .grammar file: 'x'. */
function literal(text: string): RightSideSymbol {
  return { literal: text };
}

/** A rule A → α; an empty right side is A → ε. */
function rule(leftSide: string, ...rightSide: RightSideSymbol[]): GrammarRule {
  return { leftSide, rightSide };
}

/** The 4-tuple a valid case must produce, in plain values that are easy to compare. */
export interface ExpectedGrammar {
  start: string;
  /** N, in order of first appearance as a left-hand side. */
  nonterminals: string[];
  /** Σ: the declared terminals first, then the others in order of first appearance. */
  terminals: string[];
  /** P, formatted; the position in this list is the production id. */
  productions: string[];
  /** The production ids of each nonterminal. */
  productionsByLeftSide: Record<string, number[]>;
}

export interface ValidCase {
  name: string;
  purpose: string;
  rules: GrammarRule[];
  start?: string;
  declaredTerminals?: string[];
  expected: ExpectedGrammar;
}

export interface ErrorCase {
  name: string;
  purpose: string;
  rules: GrammarRule[];
  start?: string;
  declaredTerminals?: string[];
  /** The exact message of the GrammarBuildError. */
  message: string;
}

export const validCases: ValidCase[] = [
  {
    name: 'expressions',
    purpose: 'identifiers only: left-hand sides form N, every other identifier goes to Σ',
    rules: [rule('E', 'E', '+', 'T'), rule('E', 'T'), rule('T', 'id')],
    expected: {
      start: 'E',
      nonterminals: ['E', 'T'],
      terminals: ['+', 'id'],
      productions: ['E → E + T', 'E → T', 'T → id'],
      productionsByLeftSide: { E: [0, 1], T: [2] },
    },
  },
  {
    name: 'arithmetic',
    purpose: 'literals become terminals named by their content; three levels of precedence',
    rules: [
      rule('E', 'E', literal('+'), 'T'),
      rule('E', 'T'),
      rule('T', 'T', literal('*'), 'F'),
      rule('T', 'F'),
      rule('F', literal('('), 'E', literal(')')),
      rule('F', literal('id')),
    ],
    expected: {
      start: 'E',
      nonterminals: ['E', 'T', 'F'],
      terminals: ['+', '*', '(', ')', 'id'],
      productions: ['E → E + T', 'E → T', 'T → T * F', 'T → F', 'F → ( E )', 'F → id'],
      productionsByLeftSide: { E: [0, 1], T: [2, 3], F: [4, 5] },
    },
  },
  {
    name: 'parentheses',
    purpose: 'an ε-production is an empty right side, and ε is not added to Σ',
    rules: [rule('S', literal('('), 'S', literal(')'), 'S'), rule('S')],
    expected: {
      start: 'S',
      nonterminals: ['S'],
      terminals: ['(', ')'],
      productions: ['S → ( S ) S', 'S → ε'],
      productionsByLeftSide: { S: [0, 1] },
    },
  },
  {
    name: 'epsilon-trap',
    purpose: 'a nonterminal whose only production is ε is still a nonterminal',
    rules: [rule('S', 'A', 'A', literal('x')), rule('A')],
    expected: {
      start: 'S',
      nonterminals: ['S', 'A'],
      terminals: ['x'],
      productions: ['S → A A x', 'A → ε'],
      productionsByLeftSide: { S: [0], A: [1] },
    },
  },
  {
    name: 'a-n-b-n',
    purpose: 'the classic non-regular language aⁿbⁿ: self-embedding plus ε',
    rules: [rule('S', literal('a'), 'S', literal('b')), rule('S')],
    expected: {
      start: 'S',
      nonterminals: ['S'],
      terminals: ['a', 'b'],
      productions: ['S → a S b', 'S → ε'],
      productionsByLeftSide: { S: [0, 1] },
    },
  },
  {
    name: 'palindromes',
    purpose: 'five alternatives of one nonterminal keep their written order in the index',
    rules: [
      rule('S', literal('a'), 'S', literal('a')),
      rule('S', literal('b'), 'S', literal('b')),
      rule('S', literal('a')),
      rule('S', literal('b')),
      rule('S'),
    ],
    expected: {
      start: 'S',
      nonterminals: ['S'],
      terminals: ['a', 'b'],
      productions: ['S → a S a', 'S → b S b', 'S → a', 'S → b', 'S → ε'],
      productionsByLeftSide: { S: [0, 1, 2, 3, 4] },
    },
  },
  {
    name: 'story',
    purpose: '%terminals: declared terminals come first in Σ, even EPI that no rule uses',
    rules: [
      rule('Relato', 'CRI', 'Pistas', 'REV'),
      rule('Pistas', 'PIS', 'Pistas'),
      rule('Pistas', 'PIS'),
    ],
    start: 'Relato',
    declaredTerminals: ['CRI', 'PIS', 'REV', 'EPI'],
    expected: {
      start: 'Relato',
      nonterminals: ['Relato', 'Pistas'],
      terminals: ['CRI', 'PIS', 'REV', 'EPI'],
      productions: ['Relato → CRI Pistas REV', 'Pistas → PIS Pistas', 'Pistas → PIS'],
      productionsByLeftSide: { Relato: [0], Pistas: [1, 2] },
    },
  },
  {
    name: 'explicit-start',
    purpose: '%start overrides the default (the left-hand side of the first rule)',
    rules: [rule('A', literal('a'), 'B'), rule('B', literal('b'))],
    start: 'B',
    expected: {
      start: 'B',
      nonterminals: ['A', 'B'],
      terminals: ['a', 'b'],
      productions: ['A → a B', 'B → b'],
      productionsByLeftSide: { A: [0], B: [1] },
    },
  },
  {
    name: 'scattered-rules',
    purpose:
      'rules of one nonterminal may be scattered: ids follow the text, the index groups them',
    rules: [rule('S', 'A'), rule('A', literal('x')), rule('S', literal('y'))],
    expected: {
      start: 'S',
      nonterminals: ['S', 'A'],
      terminals: ['x', 'y'],
      productions: ['S → A', 'A → x', 'S → y'],
      productionsByLeftSide: { S: [0, 2], A: [1] },
    },
  },
  {
    name: 'useless',
    purpose: 'useless symbols are valid at build time: detecting them is a later analysis',
    rules: [
      rule('S', 'A', literal('a')),
      rule('S', literal('b')),
      rule('A', 'A', literal('a')),
      rule('C', literal('c')),
    ],
    expected: {
      start: 'S',
      nonterminals: ['S', 'A', 'C'],
      terminals: ['a', 'b', 'c'],
      productions: ['S → A a', 'S → b', 'A → A a', 'C → c'],
      productionsByLeftSide: { S: [0, 1], A: [2], C: [3] },
    },
  },
  {
    name: 'empty-language',
    purpose: 'L(G) = ∅ is still a well-formed grammar: emptiness is a later analysis',
    rules: [rule('S', 'S', literal('a'))],
    expected: {
      start: 'S',
      nonterminals: ['S'],
      terminals: ['a'],
      productions: ['S → S a'],
      productionsByLeftSide: { S: [0] },
    },
  },
  {
    name: 'cyclic',
    purpose: 'a cycle S ⇒ A ⇒ S is well-formed: detecting cycles is a later analysis',
    rules: [rule('S', 'A'), rule('S', literal('a')), rule('A', 'S')],
    expected: {
      start: 'S',
      nonterminals: ['S', 'A'],
      terminals: ['a'],
      productions: ['S → A', 'S → a', 'A → S'],
      productionsByLeftSide: { S: [0, 1], A: [2] },
    },
  },
  {
    name: 'literal-and-identifier',
    purpose: "the literal 'a' and the terminal identifier a are the same terminal",
    rules: [rule('S', literal('a'), 'a')],
    expected: {
      start: 'S',
      nonterminals: ['S'],
      terminals: ['a'],
      productions: ['S → a a'],
      productionsByLeftSide: { S: [0] },
    },
  },
  {
    name: 'keywords',
    purpose: 'a literal may have several characters: if, then and skip are single terminals',
    rules: [
      rule('S', literal('if'), 'C', literal('then'), 'S'),
      rule('S', literal('skip')),
      rule('C', literal('true')),
    ],
    expected: {
      start: 'S',
      nonterminals: ['S', 'C'],
      terminals: ['if', 'then', 'skip', 'true'],
      productions: ['S → if C then S', 'S → skip', 'C → true'],
      productionsByLeftSide: { S: [0, 1], C: [2] },
    },
  },
  {
    name: 'literal-with-space',
    purpose: "A → 'b c' (one symbol) and A → b c (two symbols) are different productions",
    rules: [rule('A', literal('b c')), rule('A', 'b', 'c')],
    expected: {
      start: 'A',
      nonterminals: ['A'],
      terminals: ['b c', 'b', 'c'],
      productions: ['A → b c', 'A → b c'],
      productionsByLeftSide: { A: [0, 1] },
    },
  },
];

const reservedMessage = (symbol: string) => `"${symbol}" contains '$', which is reserved`;

export const errorCases: ErrorCase[] = [
  {
    name: 'no rules',
    purpose: 'P cannot be empty: without rules there is no N, so no S ∈ N',
    rules: [],
    message: 'Grammar "no rules" has no rules',
  },
  {
    name: 'start without rules',
    purpose: '%start must name a nonterminal: X has no rule',
    rules: [rule('S', literal('a'))],
    start: 'X',
    message: 'Start symbol "X" is not the left-hand side of any rule',
  },
  {
    name: 'start is a terminal',
    purpose: 'S ∈ N: a terminal cannot be the start symbol',
    rules: [rule('S', literal('a'))],
    start: 'a',
    message: 'Start symbol "a" is not the left-hand side of any rule',
  },
  {
    name: 'misspelled nonterminal',
    purpose: 'with %terminals, a typo (Pistass) is reported instead of becoming a terminal',
    rules: [rule('Relato', 'CRI', 'Pistass', 'REV'), rule('Pistas', 'PIS')],
    declaredTerminals: ['CRI', 'PIS', 'REV'],
    message:
      'Undeclared symbol "Pistass": it is not the left-hand side of any rule and is not listed in %terminals',
  },
  {
    name: 'declared terminal with rules',
    purpose: 'N ∩ Σ = ∅: E cannot be declared as a terminal and have a rule',
    rules: [rule('S', 'E'), rule('E', literal('x'))],
    declaredTerminals: ['E'],
    message: '"E" is declared as a terminal but is the left-hand side of a rule',
  },
  {
    name: 'literal named like a nonterminal',
    purpose: "N ∩ Σ = ∅: the literal 'E' would make E both a terminal and a nonterminal",
    rules: [rule('E', literal('E'))],
    message: "Literal 'E' has the same name as a nonterminal",
  },
  {
    name: 'repeated production',
    purpose: 'P is a set: the same production twice is rejected',
    rules: [rule('T', 'id'), rule('T', 'id')],
    message: 'Duplicate production: T → id',
  },
  {
    name: 'repeated production through a literal',
    purpose: "S → 'a' and S → a resolve to the same production",
    rules: [rule('S', literal('a')), rule('S', 'a')],
    message: 'Duplicate production: S → a',
  },
  {
    name: 'repeated ε-production',
    purpose: 'two empty right sides are the same production S → ε',
    rules: [rule('S', literal('a'), 'S'), rule('S'), rule('S')],
    message: 'Duplicate production: S → ε',
  },
  {
    name: 'empty literal',
    purpose: "'' is not a terminal: the empty string is written ε",
    rules: [rule('S', literal(''))],
    message: 'Empty literal: write ε for the empty string',
  },
  {
    name: '$ in a left-hand side',
    purpose: '$S is the augmented start symbol, reserved',
    rules: [rule('$S', literal('a'))],
    message: reservedMessage('$S'),
  },
  {
    name: '$ in an identifier',
    purpose: '$ is reserved in every position, also on the right-hand side',
    rules: [rule('S', 'a$')],
    message: reservedMessage('a$'),
  },
  {
    name: '$ as a literal',
    purpose: '$ is the end marker of FOLLOW, so it cannot be a terminal',
    rules: [rule('S', literal('$'))],
    message: reservedMessage('$'),
  },
  {
    name: '$ in %terminals',
    purpose: 'declared terminals are checked for $ too',
    rules: [rule('S', literal('a'))],
    declaredTerminals: ['$'],
    message: reservedMessage('$'),
  },
];
