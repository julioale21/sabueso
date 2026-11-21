// Productive, reachable and useless symbols, and emptiness (step 9, Hopcroft 7.1).
import { describe, expect, it } from 'vitest';
import {
  analyzeUsefulSymbols,
  computeProductive,
  computeReachable,
} from '../../src/analysis/useful.js';
import { formatProduction } from '../../src/grammar/build.js';
import { parseGrammarText } from '../../src/grammar-format/parser.js';
import type { SymbolName } from '../../src/grammar/types.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

/**
 * Hopcroft's example 7.2: S → A B | a, A → b, where B derives no string of terminals. In the
 * .grammar format a nonterminal needs a rule, so B → B c (it never ends) plays that role.
 */
const hopcroftExample = parseGrammarText("S -> A B | 'a'\nA -> 'b'\nB -> B 'c'\n", 'hopcroft');

describe('analyzeUsefulSymbols', () => {
  it('test-useless: A is not productive and, once it is removed, C is not reachable', () => {
    const analysis = analyzeUsefulSymbols(loadBuiltInGrammar('test-useless'));
    expect(analysis.productive).toEqual(new Set(['S', 'C']));
    expect(analysis.reachable).toEqual(new Set(['S']));
    expect(analysis.useless).toEqual(new Set(['A', 'C']));
    expect(analysis.isEmpty).toBe(false);
    expect(analysis.usefulGrammar?.productions.map(formatProduction)).toEqual(['S → b']);
  });

  it('test-empty: S is not productive, so L(G) = ∅ and there is no useful grammar', () => {
    const analysis = analyzeUsefulSymbols(loadBuiltInGrammar('test-empty'));
    expect(analysis.isEmpty).toBe(true);
    expect(analysis.productive).toEqual(new Set());
    expect(analysis.useless).toEqual(new Set(['S']));
    expect(analysis.usefulGrammar).toBeNull();
  });

  it.each(['g0', 'g1', 'meta', 'arithmetic', 'parentheses', 'epsilon-trap', 'test-cyclic'])(
    '%s has no useless symbols and L(G) ≠ ∅',
    (name) => {
      const grammar = loadBuiltInGrammar(name);
      const analysis = analyzeUsefulSymbols(grammar);
      expect(analysis.useless).toEqual(new Set());
      expect(analysis.isEmpty).toBe(false);
      expect(analysis.usefulGrammar?.productions).toHaveLength(grammar.productions.length);
    },
  );

  it('the order matters: removing the non-productive B first makes A unreachable', () => {
    const analysis = analyzeUsefulSymbols(hopcroftExample);
    expect(analysis.productive).toEqual(new Set(['S', 'A']));
    expect(analysis.reachable).toEqual(new Set(['S']));
    expect(analysis.useless).toEqual(new Set(['A', 'B']));
    expect(analysis.usefulGrammar?.productions.map(formatProduction)).toEqual(['S → a']);
  });

  it('in the other order, A would look reachable through S → A B, which is removed later', () => {
    const reachableFirst = computeReachable('S', hopcroftExample.productions);
    expect(reachableFirst.has('A')).toBe(true);
  });

  it('the useful grammar keeps the language and shrinks Σ to the terminals still used', () => {
    const useful = analyzeUsefulSymbols(loadBuiltInGrammar('test-useless')).usefulGrammar;
    expect(useful?.terminals).toEqual(new Set(['b']));
    expect(useful?.start).toBe('S');
  });
});

describe('the rounds of each fixed point', () => {
  it('productive: round i finds the symbols with a terminal tree of height i (G1: 4 rounds + check)', () => {
    const rounds: SymbolName[][] = [];
    computeProductive(loadBuiltInGrammar('g1'), ({ symbolsSoFar }) =>
      rounds.push([...symbolsSoFar]),
    );
    expect(rounds.map((round) => round.length)).toEqual([12, 18, 20, 21, 21]);
    expect(rounds[3]).toContain('Relato');
  });

  it('reachable: round i adds the symbols at distance i from S', () => {
    const grammar = loadBuiltInGrammar('g1');
    const rounds: number[] = [];
    computeReachable(grammar.start, grammar.productions, ({ symbolsSoFar }) =>
      rounds.push(symbolsSoFar.size),
    );
    expect(rounds).toEqual([4, 10, 18, 20, 21, 21]);
  });

  it('analyzeUsefulSymbols reports both phases, productive first', () => {
    const phases: string[] = [];
    analyzeUsefulSymbols(loadBuiltInGrammar('test-useless'), (phase) => phases.push(phase));
    expect(phases).toEqual(['productive', 'productive', 'reachable']);
  });

  it('an empty language skips the reachable phase', () => {
    const phases: string[] = [];
    analyzeUsefulSymbols(loadBuiltInGrammar('test-empty'), (phase) => phases.push(phase));
    expect(phases).toEqual(['productive']);
  });
});
