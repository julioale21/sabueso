// Cycles A ⇒+ A: found in the unit graph with a depth-first search (step 10).
import { describe, expect, it } from 'vitest';
import { buildUnitGraph, findCycles } from '../../src/analysis/cycles.js';
import { computeNullable } from '../../src/analysis/nullable.js';
import { parseGrammarText } from '../../src/grammar-format/parser.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

function cyclesOf(text: string) {
  return findCycles(parseGrammarText({ text, name: 'test' }));
}

describe('findCycles', () => {
  it('test-cyclic: S → A, A → S gives the cycle [S, A]', () => {
    expect(findCycles(loadBuiltInGrammar('test-cyclic'))).toEqual([['S', 'A']]);
  });

  it.each(['g0', 'g1', 'arithmetic', 'parentheses', 'meta'])('%s has no cycles', (name) => {
    expect(findCycles(loadBuiltInGrammar(name))).toEqual([]);
  });

  it('a unit production to itself is a cycle of one symbol', () => {
    expect(cyclesOf("S -> S | 'a'\n")).toEqual([['S']]);
  });

  it('a cycle can hide behind nullable symbols: S → A S B with A and B nullable', () => {
    expect(cyclesOf("S -> A S B | 'x'\nA -> ε | 'a'\nB -> ε | 'b'\n")).toEqual([['S']]);
  });

  it('S → S S is not a cycle when S is not nullable: the other S must produce something', () => {
    expect(cyclesOf("S -> S S | 'a'\n")).toEqual([]);
  });

  it('S → S S is a cycle when S is nullable', () => {
    expect(cyclesOf("S -> S S | 'a' | ε\n")).toEqual([['S']]);
  });

  it('a terminal next to B breaks the edge: S → A x, A → S has no cycle', () => {
    expect(cyclesOf("S -> A 'x' | 'y'\nA -> S\n")).toEqual([]);
  });

  it('finds a longer cycle in order, and a separate one', () => {
    const cycles = cyclesOf("S -> A | 'a'\nA -> B\nB -> S\nC -> D | 'c'\nD -> C\n");
    expect(cycles).toEqual([
      ['S', 'A', 'B'],
      ['C', 'D'],
    ]);
  });
});

describe('buildUnitGraph', () => {
  it('G1: an edge only where the rest of the right side is nullable', () => {
    const grammar = loadBuiltInGrammar('g1');
    const graph = buildUnitGraph({ grammar, nullable: computeNullable({ grammar }) });
    expect(graph.get('Pasos')).toEqual(['Evidencia', 'Linea']);
    expect(graph.get('Relato')).toEqual([]);
    expect(graph.get('CuerpoLinea')).toEqual(['Evidencia', 'Descarte']);
  });

  it('G0: Pasos → Pasos Pasos gives no edge Pasos → Pasos, because Pasos is not nullable', () => {
    const grammar = loadBuiltInGrammar('g0');
    const graph = buildUnitGraph({ grammar, nullable: computeNullable({ grammar }) });
    expect(graph.get('Pasos')).toEqual(['Paso']);
  });

  it('lists each target once, even if several productions lead to it', () => {
    const grammar = parseGrammarText({
      text: "S -> A | A 'x' | E A\nA -> 'a'\nE -> ε\n",
      name: 'repeated',
    });
    const graph = buildUnitGraph({ grammar, nullable: computeNullable({ grammar }) });
    expect(graph.get('S')).toEqual(['A']);
  });
});
