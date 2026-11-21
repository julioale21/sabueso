// The leftmost derivation of a parse tree (step 21).
import { describe, expect, it } from 'vitest';
import { recognize } from '../../src/earley/recognizer.js';
import { formatProduction } from '../../src/grammar/build.js';
import { tokenizeSequence } from '../../src/input/sequence.js';
import { leftmostDerivation } from '../../src/trees/derivation.js';
import { parseTrees } from '../../src/trees/enumerate.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

function derivationsOf({ grammarName, input }: { grammarName: string; input: string }) {
  const grammar = loadBuiltInGrammar(grammarName);
  return parseTrees({
    grammar,
    recognition: recognize({ grammar, tokens: tokenizeSequence(input) }),
  }).map(leftmostDerivation);
}

describe('A1 with G1: the derivation of section 9.2, step by step', () => {
  const [derivation] = derivationsOf({ grammarName: 'g1', input: 'CRI SOS PIS INT REV' });

  it('has the 19 sentential forms of the spec (steps 0 to 18)', () => {
    expect(derivation?.map((step) => step.form.join(' '))).toEqual([
      'Relato',
      'Planteo Investigacion Desenlace',
      'Hecho MarcoOpc Investigacion Desenlace',
      'CRI HallazgoOpc MarcoOpc Investigacion Desenlace',
      'CRI MarcoOpc Investigacion Desenlace',
      'CRI Investigacion Desenlace',
      'CRI Pasos Desenlace',
      'CRI Linea Lineas Desenlace',
      'CRI SOS CuerpoLinea Lineas Desenlace',
      'CRI SOS Evidencia CuerpoLinea Lineas Desenlace',
      'CRI SOS PIS CuerpoLinea Lineas Desenlace',
      'CRI SOS PIS Evidencia CuerpoLinea Lineas Desenlace',
      'CRI SOS PIS INT CuerpoLinea Lineas Desenlace',
      'CRI SOS PIS INT Lineas Desenlace',
      'CRI SOS PIS INT Desenlace',
      'CRI SOS PIS INT Resolucion EpiOpc',
      'CRI SOS PIS INT REV Cierre EpiOpc',
      'CRI SOS PIS INT REV EpiOpc',
      'CRI SOS PIS INT REV',
    ]);
  });

  it('records the production of each step; the first has none', () => {
    expect(derivation?.[0]?.production).toBeNull();
    expect(derivation?.[1]?.production && formatProduction(derivation[1].production)).toBe(
      'Relato → Planteo Investigacion Desenlace',
    );
    expect(derivation?.[4]?.production && formatProduction(derivation[4].production)).toBe(
      'HallazgoOpc → ε',
    );
  });
});

describe('every leftmost derivation', () => {
  it.each([
    ['g0', 'CRI SOS PIS INT REV'],
    ['g1', 'CTX HAL ENC INT SOS PIS DSC REV CNF CAP'],
    ['arithmetic', 'id + id * id'],
    ['parentheses', '( ( ) ) ( )'],
  ])('%s, %s: ends in the input and always replaces the leftmost nonterminal', (name, input) => {
    const grammar = loadBuiltInGrammar(name);
    for (const derivation of derivationsOf({ grammarName: name, input })) {
      expect(derivation.at(-1)?.form).toEqual(tokenizeSequence(input));
      derivation.slice(1).forEach((step, index) => {
        const before = derivation[index]?.form ?? [];
        const leftmost = before.findIndex((symbol) => grammar.nonterminals.has(symbol));
        expect(before[leftmost]).toBe(step.production?.leftSide);
      });
    }
  });

  it('G0 with A1: 4 trees give 4 different leftmost derivations, the definition of ambiguity', () => {
    const derivations = derivationsOf({ grammarName: 'g0', input: 'CRI SOS PIS INT REV' });
    const texts = derivations.map((derivation) =>
      derivation.map((step) => step.form.join(' ')).join(' ⇒ '),
    );
    expect(new Set(texts).size).toBe(4);
  });

  it('the empty input of parentheses: S ⇒ ε in one step', () => {
    const [derivation] = derivationsOf({ grammarName: 'parentheses', input: '' });
    expect(derivation?.map((step) => step.form)).toEqual([['S'], []]);
  });
});
