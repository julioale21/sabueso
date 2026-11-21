// The trace of Earley: every item added, in order, with its operation and cause (step 17).
import { describe, expect, it } from 'vitest';
import { label } from '../../src/earley/item.js';
import { recognize } from '../../src/earley/recognizer.js';
import { tokenizeSequence } from '../../src/input/sequence.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

function traceOf({ grammarName, input }: { grammarName: string; input: string }) {
  return recognize({
    grammar: loadBuiltInGrammar(grammarName),
    tokens: tokenizeSequence(input),
    options: { trace: true },
  });
}

describe('the trace of G1 with CRI PIS REV', () => {
  const { trace, chart } = traceOf({ grammarName: 'g1', input: 'CRI PIS REV' });

  it('the first event is a predict in set 0', () => {
    expect(trace[0]).toMatchObject({ set: 0, op: 'predict' });
  });

  it('the last set contains $S → Relato •, 0, and it is the last event', () => {
    expect(chart[3]?.items.map(label)).toContain('$S → Relato •, 0');
    expect(trace.at(-1)).toMatchObject({ set: 3, op: 'complete', item: '$S → Relato •, 0' });
  });

  it('one event per item added: every item of the chart except the initial one', () => {
    const items = chart.reduce((total, set) => total + set.items.length, 0);
    expect(trace.filter((event) => event.isNew)).toHaveLength(items - 1);
  });

  it('records the cause of each operation', () => {
    expect(trace).toContainEqual({
      set: 1,
      op: 'scan',
      item: 'Hecho → CRI • HallazgoOpc, 0',
      cause: 'token 0 CRI',
      isNew: true,
    });
    expect(trace).toContainEqual({
      set: 1,
      op: 'nullable',
      item: 'Hecho → CRI HallazgoOpc •, 0',
      cause: 'HallazgoOpc ⇒* ε',
      isNew: true,
    });
    expect(trace).toContainEqual({
      set: 1,
      op: 'complete',
      item: 'Planteo → Hecho • MarcoOpc, 0',
      cause: 'Hecho → CRI HallazgoOpc •, 0',
      isNew: true,
    });
  });

  it('every event names an item that is in its set', () => {
    for (const event of trace) {
      expect(chart[event.set]?.items.map(label)).toContain(event.item);
    }
  });

  it('the sets of the events never go back: S0, then S1, …', () => {
    const sets = trace.map((event) => event.set);
    expect([...sets].sort((a, b) => a - b)).toEqual(sets);
  });
});

describe('the trace in other cases', () => {
  it('A1 with G1: the last event happens in S5 (the criterion of the web player)', () => {
    expect(traceOf({ grammarName: 'g1', input: 'CRI SOS PIS INT REV' }).trace.at(-1)?.set).toBe(5);
  });

  it('G0 is ambiguous: some items are reached again, with one more link', () => {
    const repeated = traceOf({ grammarName: 'g0', input: 'CRI SOS PIS INT REV' }).trace.filter(
      (event) => !event.isNew,
    );
    expect(repeated.length).toBeGreaterThan(0);
    expect(repeated.every((event) => event.op === 'complete' || event.op === 'nullable')).toBe(
      true,
    );
  });

  it('without the trace option, there are no events', () => {
    const grammar = loadBuiltInGrammar('g1');
    expect(recognize({ grammar, tokens: ['CRI', 'PIS', 'REV'] }).trace).toEqual([]);
  });
});
