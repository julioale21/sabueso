// The first three steps of the Chomsky normal form: START, DEL and UNIT (step 23).
import { describe, expect, it } from 'vitest';
import { addNewStart } from '../../src/chomsky-normal-form/add-new-start.js';
import { removeEpsilonProductions } from '../../src/chomsky-normal-form/remove-epsilon-productions.js';
import {
  computeUnitPairs,
  isUnit,
  removeUnitProductions,
} from '../../src/chomsky-normal-form/remove-unit-productions.js';
import { recognize } from '../../src/earley/recognizer.js';
import { formatProduction } from '../../src/grammar/build.js';
import type { Grammar, SymbolName } from '../../src/grammar/types.js';
import { parseGrammarText } from '../../src/grammar-format/parser.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

const productions = (grammar: Grammar): string[] => grammar.productions.map(formatProduction);

/** The grammar after START, after DEL and after UNIT, in order. */
function firstThreeSteps(grammar: Grammar): [Grammar, Grammar, Grammar] {
  const started = addNewStart(grammar);
  const withoutEpsilon = removeEpsilonProductions(started);
  return [started, withoutEpsilon, removeUnitProductions(withoutEpsilon)];
}

/** Every string over the alphabet of length 0 to maxLength, shortest first. */
function stringsUpTo({
  alphabet,
  maxLength,
}: {
  alphabet: readonly SymbolName[];
  maxLength: number;
}): SymbolName[][] {
  const strings: SymbolName[][] = [[]];
  let previous: SymbolName[][] = [[]];
  for (let length = 1; length <= maxLength; length++) {
    previous = previous.flatMap((prefix) => alphabet.map((symbol) => [...prefix, symbol]));
    strings.push(...previous);
  }
  return strings;
}

const accepts = ({
  grammar,
  tokens,
}: {
  grammar: Grammar;
  tokens: readonly SymbolName[];
}): boolean => recognize(grammar, tokens).accepted;

describe('START: a new start symbol S0 → S, only if S appears on some right side', () => {
  it('adds S0 → S first in parentheses, where S is in S → ( S ) S', () => {
    const parentheses = loadBuiltInGrammar('parentheses');
    const started = addNewStart(parentheses);
    expect(started.start).toBe('S0');
    expect(started.nonterminals.has('S0')).toBe(true);
    expect(productions(started)).toEqual(['S0 → S', 'S → ( S ) S', 'S → ε']);
    expect(started.terminals).toEqual(parentheses.terminals);
  });

  it.each(['g1', 'g0', 'epsilon-trap'])(
    'leaves %s as it is: its start symbol is on no right side',
    (name) => {
      const grammar = loadBuiltInGrammar(name);
      expect(addNewStart(grammar)).toBe(grammar);
    },
  );

  it.each(['arithmetic', 'arithmetic-ambiguous', 'test-cyclic'])(
    'adds S0 to %s, whose start symbol is on some right side',
    (name) => {
      expect(addNewStart(loadBuiltInGrammar(name)).start).toBe('S0');
    },
  );

  it('uses S0′ when the grammar already has a symbol S0', () => {
    const grammar = parseGrammarText({ text: "S0 -> 'a' S0 | 'b'\n", name: 'own-s0' });
    expect(addNewStart(grammar).start).toBe("S0'");
  });
});

describe('DEL: no ε-productions, except S → ε for the start symbol when ε ∈ L(G)', () => {
  it('parentheses (computed by hand): every version of ( S ) S, and S0 → ε', () => {
    const [, withoutEpsilon] = firstThreeSteps(loadBuiltInGrammar('parentheses'));
    expect(productions(withoutEpsilon)).toEqual([
      'S0 → S',
      'S0 → ε',
      'S → ( S ) S',
      'S → ( S )',
      'S → ( ) S',
      'S → ( )',
    ]);
  });

  it('epsilon-trap (computed by hand): A A x gives A x only once, and A keeps no production', () => {
    const [, withoutEpsilon] = firstThreeSteps(loadBuiltInGrammar('epsilon-trap'));
    expect(productions(withoutEpsilon)).toEqual(['S → A A x', 'S → A x', 'S → x']);
    expect(withoutEpsilon.nonterminals.has('A')).toBe(true);
    expect(withoutEpsilon.productionsByLeftSide.get('A')).toEqual([]);
  });

  it('keeps S → ε when the start symbol is nullable and START left it as it was', () => {
    const grammar = parseGrammarText({
      text: "S -> A B\nA -> 'a' | ε\nB -> 'b' | ε\n",
      name: 'optional-pair',
    });
    const [started, withoutEpsilon, withoutUnits] = firstThreeSteps(grammar);
    expect(started).toBe(grammar);
    expect(productions(withoutEpsilon)).toEqual([
      'S → A B',
      'S → A',
      'S → B',
      'S → ε',
      'A → a',
      'B → b',
    ]);
    expect(productions(withoutUnits)).toEqual([
      'S → A B',
      'S → ε',
      'S → a',
      'S → b',
      'A → a',
      'B → b',
    ]);
    for (const tokens of stringsUpTo({ alphabet: ['a', 'b'], maxLength: 3 })) {
      expect(accepts({ grammar: withoutUnits, tokens })).toBe(accepts({ grammar, tokens }));
    }
  });

  it('leaves G1 with no ε-production at all: ε ∉ L(G1)', () => {
    const [, withoutEpsilon] = firstThreeSteps(loadBuiltInGrammar('g1'));
    expect(withoutEpsilon.productions.some((p) => p.rightSide.length === 0)).toBe(false);
    expect(productions(withoutEpsilon)).toContain('Planteo → Hecho');
    expect(productions(withoutEpsilon)).toContain('Linea → SOS');
  });
});

describe('UNIT: no production A → B', () => {
  it('the unit pairs of parentheses after DEL: (S0, S0), (S0, S) and (S, S)', () => {
    const [, withoutEpsilon] = firstThreeSteps(loadBuiltInGrammar('parentheses'));
    const pairs = computeUnitPairs(withoutEpsilon);
    expect(pairs.get('S0')).toEqual(new Set(['S0', 'S']));
    expect(pairs.get('S')).toEqual(new Set(['S']));
  });

  it('parentheses (computed by hand): S0 gets the four productions of S', () => {
    const [, , withoutUnits] = firstThreeSteps(loadBuiltInGrammar('parentheses'));
    expect(productions(withoutUnits)).toEqual([
      'S0 → ε',
      'S0 → ( S ) S',
      'S0 → ( S )',
      'S0 → ( ) S',
      'S0 → ( )',
      'S → ( S ) S',
      'S → ( S )',
      'S → ( ) S',
      'S → ( )',
    ]);
  });

  it('breaks the cycle S ⇒ A ⇒ S of test-cyclic', () => {
    const [, withoutEpsilon, withoutUnits] = firstThreeSteps(loadBuiltInGrammar('test-cyclic'));
    expect(computeUnitPairs(withoutEpsilon).get('A')).toEqual(new Set(['A', 'S']));
    expect(productions(withoutUnits)).toEqual(['S0 → a', 'S → a', 'A → a']);
  });

  it.each(['g0', 'g1', 'arithmetic', 'arithmetic-ambiguous', 'parentheses', 'test-cyclic'])(
    'leaves %s with no unit production',
    (name) => {
      const [, , withoutUnits] = firstThreeSteps(loadBuiltInGrammar(name));
      expect(
        withoutUnits.productions.filter((production) =>
          isUnit({ production, grammar: withoutUnits }),
        ),
      ).toEqual([]);
    },
  );
});

describe('the language is preserved after each step', () => {
  it('every sentence of G1 of length ≤ 4 is accepted after START, DEL and UNIT', () => {
    const g1 = loadBuiltInGrammar('g1');
    const steps = firstThreeSteps(g1);
    const sentences = stringsUpTo({ alphabet: [...g1.terminals], maxLength: 4 }).filter((tokens) =>
      accepts({ grammar: g1, tokens }),
    );
    expect(sentences.length).toBeGreaterThan(0);
    for (const step of steps) {
      expect(sentences.filter((tokens) => !accepts({ grammar: step, tokens }))).toEqual([]);
    }
  });

  it('G0 and G1 accept and reject the same strings of length ≤ 3 after each step', () => {
    for (const grammar of [loadBuiltInGrammar('g0'), loadBuiltInGrammar('g1')]) {
      const strings = stringsUpTo({ alphabet: [...grammar.terminals], maxLength: 3 });
      for (const step of firstThreeSteps(grammar)) {
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
    ['test-cyclic', ['a'], 3],
  ])('%s keeps its language up to length %#, ε included', (name, alphabet, maxLength) => {
    const grammar = loadBuiltInGrammar(name);
    const strings = stringsUpTo({ alphabet, maxLength });
    for (const step of firstThreeSteps(grammar)) {
      expect(
        strings.filter(
          (tokens) => accepts({ grammar: step, tokens }) !== accepts({ grammar, tokens }),
        ),
      ).toEqual([]);
    }
  });
});
