// The last three steps of the Chomsky normal form, USELESS, TERM and BIN, and the whole
// conversion (step 24).
import { describe, expect, it } from 'vitest';
import { binarize } from '../../src/chomsky-normal-form/binarize.js';
import {
  isChomskyNormalForm,
  productionsOutsideChomskyNormalForm,
  toChomskyNormalForm,
} from '../../src/chomsky-normal-form/index.js';
import { isolateTerminals } from '../../src/chomsky-normal-form/isolate-terminals.js';
import { removeUselessSymbols } from '../../src/chomsky-normal-form/remove-useless-symbols.js';
import { formatProduction } from '../../src/grammar/build.js';
import type { Grammar } from '../../src/grammar/types.js';
import { parseGrammarText } from '../../src/grammar-format/parser.js';
import { accepts, stringsUpTo } from '../helpers/language.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

const productions = (grammar: Grammar): string[] => grammar.productions.map(formatProduction);

/** The grammar after a given step of the conversion. */
function after({ grammar, step }: { grammar: Grammar; step: string }): Grammar {
  const found = toChomskyNormalForm(grammar).steps.find((each) => each.name === step);
  if (found === undefined) {
    throw new Error(`no step ${step}`);
  }
  return found.grammar;
}

const BUILT_IN_GRAMMARS = [
  'g1',
  'g0',
  'meta',
  'arithmetic-ambiguous',
  'arithmetic',
  'parentheses',
  'epsilon-trap',
  'test-useless',
  'test-empty',
  'test-cyclic',
];

describe('USELESS: no nonterminal that is not productive or not reachable', () => {
  it('test-useless (computed by hand): A never ends and C is not reachable, only S → b stays', () => {
    const withoutUseless = after({ grammar: loadBuiltInGrammar('test-useless'), step: 'USELESS' });
    expect(productions(withoutUseless)).toEqual(['S → b']);
    expect([...withoutUseless.nonterminals]).toEqual(['S']);
  });

  it('epsilon-trap: removes A, which DEL left with no productions', () => {
    const withoutUseless = after({ grammar: loadBuiltInGrammar('epsilon-trap'), step: 'USELESS' });
    expect(productions(withoutUseless)).toEqual(['S → x']);
    expect(withoutUseless.nonterminals.has('A')).toBe(false);
  });

  it('G1: removes Descarte, which only the unit production CuerpoLinea → Descarte reached', () => {
    const grammar = loadBuiltInGrammar('g1');
    const withoutUnits = after({ grammar, step: 'UNIT' });
    const withoutUseless = removeUselessSymbols(withoutUnits);
    expect(withoutUseless.nonterminals.has('Descarte')).toBe(false);
    expect(withoutUseless.productions).toHaveLength(withoutUnits.productions.length - 2);
  });

  it('test-empty: L(G) = ∅ leaves no productions, but keeps the start symbol', () => {
    const withoutUseless = after({ grammar: loadBuiltInGrammar('test-empty'), step: 'USELESS' });
    expect(withoutUseless.productions).toEqual([]);
    expect([...withoutUseless.nonterminals]).toEqual(['S0']);
    expect(withoutUseless.start).toBe('S0');
  });

  it('returns the same grammar when every symbol is useful', () => {
    const grammar = after({ grammar: loadBuiltInGrammar('parentheses'), step: 'UNIT' });
    expect(removeUselessSymbols(grammar)).toBe(grammar);
  });
});

describe('TERM: terminals only alone, in A → a', () => {
  it('parentheses (computed by hand): ( and ) become T_( and T_), added at the end', () => {
    const terms = after({ grammar: loadBuiltInGrammar('parentheses'), step: 'TERM' });
    expect(productions(terms)).toEqual([
      'S0 → ε',
      'S0 → T_( S T_) S',
      'S0 → T_( S T_)',
      'S0 → T_( T_) S',
      'S0 → T_( T_)',
      'S → T_( S T_) S',
      'S → T_( S T_)',
      'S → T_( T_) S',
      'S → T_( T_)',
      'T_( → (',
      'T_) → )',
    ]);
  });

  it('leaves A → a and S → ε as they are', () => {
    const grammar = parseGrammarText({ text: "S -> A 'b' | 'c'\nA -> 'a'\n", name: 'short' });
    expect(productions(isolateTerminals(grammar))).toEqual([
      'S → A T_b',
      'S → c',
      'A → a',
      'T_b → b',
    ]);
  });

  it('uses T_a′ when the grammar already has a symbol T_a', () => {
    const grammar = parseGrammarText({ text: "S -> 'a' T_a\nT_a -> 'c'\n", name: 'own-t' });
    expect(productions(isolateTerminals(grammar))).toEqual(["S → T_a' T_a", 'T_a → c', "T_a' → a"]);
  });
});

describe('BIN: right sides of length at most 2', () => {
  it('splits A → B C D E into A → B X1, X1 → C X2, X2 → D E', () => {
    const grammar = parseGrammarText({
      text: "A -> B C D E | B C\nB -> 'b'\nC -> 'c'\nD -> 'd'\nE -> 'e'\n",
      name: 'long',
    });
    expect(productions(binarize(grammar))).toEqual([
      'A → B X1',
      'X1 → C X2',
      'X2 → D E',
      'A → B C',
      'B → b',
      'C → c',
      'D → d',
      'E → e',
    ]);
  });

  it('numbers the chains across the grammar and skips a name already in use', () => {
    const grammar = parseGrammarText({
      text: "S -> X1 X1 X1 | X1 X1 X1 X1\nX1 -> 'x'\n",
      name: 'own-x',
    });
    expect(productions(binarize(grammar))).toEqual([
      'S → X1 X2',
      'X2 → X1 X1',
      'S → X1 X3',
      'X3 → X1 X4',
      'X4 → X1 X1',
      'X1 → x',
    ]);
  });

  it('returns the same grammar when no right side is longer than 2', () => {
    const grammar = after({ grammar: loadBuiltInGrammar('epsilon-trap'), step: 'TERM' });
    expect(binarize(grammar)).toBe(grammar);
  });
});

describe('toChomskyNormalForm and isChomskyNormalForm', () => {
  it.each(BUILT_IN_GRAMMARS)('%s ends in Chomsky normal form', (name) => {
    const result = toChomskyNormalForm(loadBuiltInGrammar(name));
    expect(productionsOutsideChomskyNormalForm(result.grammar)).toEqual([]);
    expect(isChomskyNormalForm(result.grammar)).toBe(true);
    expect(result.steps.map((step) => step.name)).toEqual([
      'START',
      'DEL',
      'UNIT',
      'USELESS',
      'TERM',
      'BIN',
    ]);
  });

  it('parentheses keeps ε: acceptsEmpty, with S0 → ε and S0 on no right side', () => {
    const result = toChomskyNormalForm(loadBuiltInGrammar('parentheses'));
    expect(result.acceptsEmpty).toBe(true);
    expect(productions(result.grammar)).toContain('S0 → ε');
    expect(result.grammar.productions).toHaveLength(19);
  });

  it('G1 does not keep ε and ends with 78 productions (40 → 46 → 69 → 67 → 75 → 78)', () => {
    const result = toChomskyNormalForm(loadBuiltInGrammar('g1'));
    expect(result.acceptsEmpty).toBe(false);
    expect(result.steps.map((step) => step.grammar.productions.length)).toEqual([
      40, 46, 69, 67, 75, 78,
    ]);
  });

  it('a grammar before the conversion is not in FNC, and says which productions break it', () => {
    const parentheses = loadBuiltInGrammar('parentheses');
    expect(isChomskyNormalForm(parentheses)).toBe(false);
    expect(productionsOutsideChomskyNormalForm(parentheses).map(formatProduction)).toEqual([
      'S → ( S ) S',
      'S → ε',
    ]);
  });

  it('S → ε breaks the FNC when S appears on a right side', () => {
    const grammar = parseGrammarText({ text: "S -> A S | ε\nA -> 'a'\n", name: 'start-inside' });
    expect(productionsOutsideChomskyNormalForm(grammar).map(formatProduction)).toEqual(['S → ε']);
  });
});

describe('the language is preserved after USELESS, TERM and BIN', () => {
  const lastThree = (grammar: Grammar): Grammar[] =>
    ['USELESS', 'TERM', 'BIN'].map((step) => after({ grammar, step }));

  it('every sentence of G1 of length ≤ 4 is still accepted', () => {
    const g1 = loadBuiltInGrammar('g1');
    const sentences = stringsUpTo({ alphabet: [...g1.terminals], maxLength: 4 }).filter((tokens) =>
      accepts({ grammar: g1, tokens }),
    );
    expect(sentences.length).toBeGreaterThan(0);
    for (const step of lastThree(g1)) {
      expect(sentences.filter((tokens) => !accepts({ grammar: step, tokens }))).toEqual([]);
    }
  });

  it('G0 and G1 accept and reject the same strings of length ≤ 3', () => {
    for (const grammar of [loadBuiltInGrammar('g0'), loadBuiltInGrammar('g1')]) {
      const strings = stringsUpTo({ alphabet: [...grammar.terminals], maxLength: 3 });
      for (const step of lastThree(grammar)) {
        expect(
          strings.filter(
            (tokens) => accepts({ grammar: step, tokens }) !== accepts({ grammar, tokens }),
          ),
        ).toEqual([]);
      }
    }
  });

  it.each([
    ['parentheses', ['(', ')'], 6],
    ['epsilon-trap', ['x'], 3],
    ['arithmetic', ['id', '+', '*', '(', ')'], 4],
    ['arithmetic-ambiguous', ['id', '+', '*', '(', ')'], 4],
    ['test-useless', ['a', 'b', 'c'], 3],
    ['test-empty', ['a'], 3],
    ['test-cyclic', ['a'], 3],
  ])('%s keeps its language up to length %#, ε included', (name, alphabet, maxLength) => {
    const grammar = loadBuiltInGrammar(name);
    const strings = stringsUpTo({ alphabet, maxLength });
    for (const step of lastThree(grammar)) {
      expect(
        strings.filter(
          (tokens) => accepts({ grammar: step, tokens }) !== accepts({ grammar, tokens }),
        ),
      ).toEqual([]);
    }
  });
});
