// The pushdown automaton of a grammar and its breadth-first simulation (step 26).
import { describe, expect, it } from 'vitest';
import { recognize } from '../../src/earley/recognizer.js';
import { formatProduction } from '../../src/grammar/build.js';
import type { SymbolName } from '../../src/grammar/types.js';
import { parseGrammarText } from '../../src/grammar-format/parser.js';
import { buildPushdownAutomaton } from '../../src/pushdown-automaton/build.js';
import { simulatePushdownAutomaton } from '../../src/pushdown-automaton/simulate.js';
import { leftmostDerivation } from '../../src/trees/derivation.js';
import { parseTrees } from '../../src/trees/enumerate.js';
import { accepts, stringsUpTo } from '../helpers/language.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

const tokensOf = (input: string): SymbolName[] => input.split(' ').filter(Boolean);

describe('buildPushdownAutomaton: P = ({q}, Σ, N ∪ Σ, δ, q, S)', () => {
  it('G1: 40 expand transitions (one per production) and 14 match (one per tag)', () => {
    const g1 = loadBuiltInGrammar('g1');
    const automaton = buildPushdownAutomaton(g1);
    expect(automaton.state).toBe('q');
    expect(automaton.startStack).toBe('Relato');
    expect(automaton.inputAlphabet).toEqual(g1.terminals);
    expect(automaton.stackAlphabet.size).toBe(21 + 14);
    expect(automaton.transitions.filter((t) => t.kind === 'expand')).toHaveLength(40);
    expect(automaton.transitions.filter((t) => t.kind === 'match')).toHaveLength(14);
  });

  it('parentheses: S → ( S ) S | ε gives two expands, and ( and ) one match each', () => {
    expect(buildPushdownAutomaton(loadBuiltInGrammar('parentheses')).transitions).toEqual([
      expect.objectContaining({ kind: 'expand', top: 'S', push: ['(', 'S', ')', 'S'] }),
      expect.objectContaining({ kind: 'expand', top: 'S', push: [] }),
      { kind: 'match', terminal: '(' },
      { kind: 'match', terminal: ')' },
    ]);
  });
});

describe('simulatePushdownAutomaton', () => {
  it('P1: ( ( ) ) ( ) with parentheses is accepted, and so is the empty input', () => {
    const parentheses = loadBuiltInGrammar('parentheses');
    expect(
      simulatePushdownAutomaton({ grammar: parentheses, tokens: tokensOf('( ( ) ) ( )') }).result,
    ).toBe('accept');
    expect(simulatePushdownAutomaton({ grammar: parentheses, tokens: [] }).result).toBe('accept');
  });

  it('CRI PIS REV with G1: the path of card 24, description by description', () => {
    const run = simulatePushdownAutomaton({
      grammar: loadBuiltInGrammar('g1'),
      tokens: tokensOf('CRI PIS REV'),
    });
    expect(run.result).toBe('accept');
    const rows = run.acceptingPath?.map(({ id, via }) => [
      id.position,
      id.stack.join(' ') || 'ε',
      via === null ? '' : via.kind === 'match' ? `match ${via.terminal}` : `(${via.production.id})`,
    ]);
    expect(rows).toEqual([
      [0, 'Relato', ''],
      [0, 'Planteo Investigacion Desenlace', '(0)'],
      [0, 'Hecho MarcoOpc Investigacion Desenlace', '(1)'],
      [0, 'CRI HallazgoOpc MarcoOpc Investigacion Desenlace', '(11)'],
      [1, 'HallazgoOpc MarcoOpc Investigacion Desenlace', 'match CRI'],
      [1, 'MarcoOpc Investigacion Desenlace', '(14)'],
      [1, 'Investigacion Desenlace', '(4)'],
      [1, 'Pasos Desenlace', '(15)'],
      [1, 'Evidencia Libres Lineas Desenlace', '(17)'],
      [1, 'PIS Libres Lineas Desenlace', '(28)'],
      [2, 'Libres Lineas Desenlace', 'match PIS'],
      [2, 'Lineas Desenlace', '(20)'],
      [2, 'Desenlace', '(22)'],
      [2, 'Resolucion EpiOpc', '(31)'],
      [2, 'REV Cierre EpiOpc', '(34)'],
      [3, 'Cierre EpiOpc', 'match REV'],
      [3, 'EpiOpc', '(37)'],
      [3, 'ε', '(33)'],
    ]);
  });

  it('AP1: the expansions of the path of A1 with G1 are its leftmost derivation, in order', () => {
    const g1 = loadBuiltInGrammar('g1');
    const tokens = tokensOf('CRI SOS PIS INT REV');
    const run = simulatePushdownAutomaton({ grammar: g1, tokens });
    expect(run.result).toBe('accept');
    const expansions = (run.acceptingPath ?? []).flatMap(({ via }) =>
      via?.kind === 'expand' ? [formatProduction(via.production)] : [],
    );
    const [tree] = parseTrees({ grammar: g1, recognition: recognize({ grammar: g1, tokens }) });
    const derivation = leftmostDerivation(tree ?? { kind: 'epsilon' }).flatMap(({ production }) =>
      production === null ? [] : [formatProduction(production)],
    );
    expect(expansions).toHaveLength(18);
    expect(expansions).toEqual(derivation);
  });

  it('in every description, what was read followed by the stack is a form of the derivation', () => {
    const g1 = loadBuiltInGrammar('g1');
    const tokens = tokensOf('CRI SOS PIS INT REV');
    const run = simulatePushdownAutomaton({ grammar: g1, tokens });
    const [tree] = parseTrees({ grammar: g1, recognition: recognize({ grammar: g1, tokens }) });
    const forms = new Set(
      leftmostDerivation(tree ?? { kind: 'epsilon' }).map(({ form }) => form.join(' ')),
    );
    for (const { id } of run.acceptingPath ?? []) {
      expect(forms).toContain([...tokens.slice(0, id.position), ...id.stack].join(' '));
    }
    expect(run.acceptingPath?.at(-1)?.id).toEqual({ position: 5, stack: [] });
  });

  it('CRI REV with G1 is rejected: Relato needs at least 3 tags (minYield), so nothing is explored', () => {
    const run = simulatePushdownAutomaton({
      grammar: loadBuiltInGrammar('g1'),
      tokens: tokensOf('CRI REV'),
    });
    expect(run).toEqual({ result: 'reject', steps: 1, acceptingPath: null });
  });

  it('a cycle S ⇒ A ⇒ S does not loop: the visited set skips the repeated stack', () => {
    const run = simulatePushdownAutomaton({
      grammar: loadBuiltInGrammar('test-cyclic'),
      tokens: ['a'],
    });
    expect(run.result).toBe('accept');
  });

  it('an empty language rejects every input', () => {
    const run = simulatePushdownAutomaton({
      grammar: loadBuiltInGrammar('test-empty'),
      tokens: ['a', 'a'],
    });
    expect(run.result).toBe('reject');
  });

  it('a stack that grows without needing tags stops at maxSteps: undetermined', () => {
    // S → S B with B ⇒ ε: the stack S B B B … never repeats and never needs more tags.
    const grammar = parseGrammarText({ text: "S -> S B | 'a'\nB -> ε\n", name: 'growing' });
    const run = simulatePushdownAutomaton({ grammar, tokens: ['a', 'a'], maxSteps: 500 });
    expect(run).toEqual({ result: 'undetermined', steps: 500, acceptingPath: null });
  });
});

describe('the pushdown automaton and Earley accept the same strings', () => {
  it.each([
    ['parentheses', ['(', ')'], 6],
    ['arithmetic', ['id', '+', '*', '(', ')'], 4],
    ['arithmetic-ambiguous', ['id', '+', '*', '(', ')'], 4],
    ['epsilon-trap', ['x'], 3],
    ['test-cyclic', ['a'], 3],
  ])('%s, every string up to length %#, never undetermined', (name, alphabet, maxLength) => {
    const grammar = loadBuiltInGrammar(name);
    for (const tokens of stringsUpTo({ alphabet, maxLength })) {
      const { result } = simulatePushdownAutomaton({ grammar, tokens });
      expect(result).not.toBe('undetermined');
      expect(result === 'accept').toBe(accepts({ grammar, tokens }));
    }
  });

  it('G0 and G1, every string up to length 3', () => {
    for (const name of ['g0', 'g1']) {
      const grammar = loadBuiltInGrammar(name);
      const differences = stringsUpTo({ alphabet: [...grammar.terminals], maxLength: 3 }).filter(
        (tokens) =>
          (simulatePushdownAutomaton({ grammar, tokens }).result === 'accept') !==
          accepts({ grammar, tokens }),
      );
      expect(differences).toEqual([]);
    }
  });
});
