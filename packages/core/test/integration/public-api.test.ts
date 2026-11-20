// The whole engine through its public API only (src/index.ts), as the web will use it.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  analyzeGrammar,
  buildGrammar,
  genres,
  parse,
  parseGrammarText,
  renderDerivation,
  renderTree,
  runDeterministicAutomaton,
  type Grammar,
} from '../../src/index.js';

function loadGenreGrammar(id: string): Grammar {
  const url = new URL(`../../grammars/genres/${id}.grammar`, import.meta.url);
  return parseGrammarText(readFileSync(url, 'utf8'), id);
}

const g0 = loadGenreGrammar('detective/g0');
const g1 = loadGenreGrammar('detective/g1');

describe('the public API', () => {
  it('the catalog names the official grammar of the detective story', () => {
    expect(genres[0]?.officialGrammar).toBe('detective/g1');
  });

  it('analyzeGrammar: G1 is LL(1), G0 is not', () => {
    expect(analyzeGrammar(g1).predictiveTable.isPredictive).toBe(true);
    expect(analyzeGrammar(g0).predictiveTable.isPredictive).toBe(false);
  });

  it('parse accepts A1: 4 trees in G0, 1 in G1, with the derivation of the first', () => {
    const inG0 = parse(g0, 'CRI SOS PIS INT REV', { maxTrees: 10 });
    const inG1 = parse(g1, 'CRI SOS PIS INT REV');
    expect(inG0.accepted && inG0.treeCount).toBe(4n);
    expect(inG0.accepted && inG0.trees).toHaveLength(4);
    expect(inG1.accepted && inG1.treeCount).toBe(1n);
    expect(inG1.accepted && inG1.derivation).toHaveLength(19);
  });

  it('parse rejects I1 with its diagnosis', () => {
    const result = parse(g1, 'CTX PER PIS REV');
    expect(result.accepted).toBe(false);
    expect(!result.accepted && result.error).toEqual({
      kind: 'unexpected-token',
      position: 2,
      found: 'PIS',
      expected: ['CRI', 'HAL'],
    });
  });

  it('parse reports a symbol outside Σ before running Earley', () => {
    const result = parse(g1, ['CRI', 'XYZ', 'REV']);
    expect(!result.accepted && result.error.kind).toBe('unknown-symbol');
    expect(result.chart).toEqual([]);
  });

  it('the trace is empty unless asked for', () => {
    expect(parse(g1, 'CRI PIS REV').trace).toEqual([]);
    expect(parse(g1, 'CRI PIS REV', { trace: true }).trace.length).toBeGreaterThan(0);
  });

  it('countTrees: false skips the count', () => {
    const result = parse(g0, 'CRI SOS PIS INT REV', { countTrees: false });
    expect(result.accepted && result.treeCount).toBeNull();
  });

  it('the classic algorithm can still be asked for', () => {
    const trap = parseGrammarText("S -> A A 'x'\nA -> ε\n", 'epsilon-trap');
    expect(parse(trap, 'x').accepted).toBe(true);
    expect(parse(trap, 'x', { classicEpsilon: true }).accepted).toBe(false);
  });

  it('renderTree and renderDerivation draw the result', () => {
    const result = parse(g0, 'CRI PIS REV');
    if (!result.accepted || result.trees[0] === undefined) throw new Error('expected a tree');
    expect(renderTree(result.trees[0]).split('\n')[0]).toBe('Relato');
    expect(renderDerivation(result.derivation).split('\n')).toEqual([
      '0   Relato',
      '1 ⇒ Planteo Investigacion Desenlace',
      '2 ⇒ Hecho Investigacion Desenlace',
      '3 ⇒ CRI Investigacion Desenlace',
      '4 ⇒ CRI Pasos Desenlace',
      '5 ⇒ CRI Paso Desenlace',
      '6 ⇒ CRI PIS Desenlace',
      '7 ⇒ CRI PIS Resolucion',
      '8 ⇒ CRI PIS REV',
    ]);
  });

  it('a grammar built in code works the same as one read from a file', () => {
    const grammar = buildGrammar('tiny', [
      { leftSide: 'S', rightSide: ['a', 'S'] },
      { leftSide: 'S', rightSide: [] },
    ]);
    expect(parse(grammar, 'a a').accepted).toBe(true);
  });

  it('the DFA executor is available for SPEC 04', () => {
    const tokens = runDeterministicAutomaton(
      {
        initialState: 'start',
        classifyCharacter: (character) => (/[0-9]/.test(character) ? 'digit' : 'other'),
        transitions: { start: { digit: 'number' }, number: { digit: 'number' } },
        acceptingStates: { number: 'NUMBER' },
      },
      '42',
    );
    expect(tokens).toEqual([{ kind: 'NUMBER', text: '42', line: 1, column: 1 }]);
  });
});
