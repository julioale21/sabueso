// Nullable symbols (A ⇒* ε) by least fixed point: the values of step 7 of the spec.
import { describe, expect, it } from 'vitest';
import { computeNullable } from '../../src/analysis/nullable.js';
import { parseGrammarText } from '../../src/grammar-format/parser.js';
import type { SymbolName } from '../../src/grammar/types.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

/** S → A B x | B B, B → A A | b, A → a | ε: one new nullable symbol per round. */
const chainGrammar = parseGrammarText(
  "S -> A B 'x' | B B\nB -> A A | 'b'\nA -> 'a' | ε\n",
  'chain',
);

describe('computeNullable', () => {
  it('G0 has no nullable symbols: it has no ε-productions', () => {
    expect(computeNullable(loadBuiltInGrammar('g0'))).toEqual(new Set());
  });

  it('parentheses: S → ε makes S nullable', () => {
    expect(computeNullable(loadBuiltInGrammar('parentheses'))).toEqual(new Set(['S']));
  });

  it('epsilon-trap: A is nullable, S is not (S → A A x needs the terminal x)', () => {
    expect(computeNullable(loadBuiltInGrammar('epsilon-trap'))).toEqual(new Set(['A']));
  });

  it('G1 has the 10 nullable symbols of its optional parts', () => {
    expect(computeNullable(loadBuiltInGrammar('g1'))).toEqual(
      new Set([
        'MarcoOpc',
        'PerOpc',
        'CtxOpc',
        'HallazgoOpc',
        'Libres',
        'Lineas',
        'CuerpoLinea',
        'EpiOpc',
        'Cierre',
        'CapOpc',
      ]),
    );
  });

  it('a symbol whose productions are all nullable is nullable too, one round later', () => {
    expect(computeNullable(chainGrammar)).toEqual(new Set(['A', 'B', 'S']));
  });

  it('terminals are never nullable, even when the rest of the right side is', () => {
    const grammar = parseGrammarText("S -> A 'x'\nA -> ε\n", 'terminal');
    expect(computeNullable(grammar)).toEqual(new Set(['A']));
  });

  it('a symbol in a cycle with no way out to ε is not nullable', () => {
    expect(computeNullable(loadBuiltInGrammar('test-cyclic'))).toEqual(new Set());
  });
});

describe('computeNullable with onIteration', () => {
  function rounds(grammarName: string | undefined): SymbolName[][] {
    const grammar = grammarName === undefined ? chainGrammar : loadBuiltInGrammar(grammarName);
    const seen: SymbolName[][] = [];
    computeNullable(grammar, (iteration, nullable) => {
      expect(iteration).toBe(seen.length + 1);
      seen.push([...nullable].sort());
    });
    return seen;
  }

  it('round i finds the symbols with an ε-tree of height i; the last round adds nothing', () => {
    expect(rounds(undefined)).toEqual([['A'], ['A', 'B'], ['A', 'B', 'S'], ['A', 'B', 'S']]);
  });

  it('G1 needs two rounds: all 10 at once, then the check', () => {
    const seen = rounds('g1');
    expect(seen).toHaveLength(2);
    expect(seen[0]).toHaveLength(10);
    expect(seen[1]).toEqual(seen[0]);
  });

  it('G0 stops after one round, with ∅', () => {
    expect(rounds('g0')).toEqual([[]]);
  });

  it('the snapshots are copies: later rounds do not change them', () => {
    const snapshots: ReadonlySet<SymbolName>[] = [];
    computeNullable(chainGrammar, (_iteration, nullable) => snapshots.push(nullable));
    expect(snapshots.map((snapshot) => snapshot.size)).toEqual([1, 2, 3, 3]);
  });
});
