// The Earley items left open where a story fails (SPEC 05, N1; moved from the web).
import { describe, expect, it } from 'vitest';
import { label } from '../../src/earley/item.js';
import { parse } from '../../src/parse.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

const g1 = loadBuiltInGrammar('g1');

/** The open items of a rejected story with G1, written as the traces write items. */
function openItemsOf(input: string) {
  const result = parse({ grammar: g1, input });
  if (result.accepted) {
    throw new Error(`${input} should be rejected`);
  }
  const open = result.openItems;
  return open === null
    ? null
    : { set: open.set, started: open.started.map(label), waiting: open.waiting.map(label) };
}

describe('openItemsAt, through parse()', () => {
  it('I1: the setting is complete, so Planteo waits for the crime in S2', () => {
    expect(openItemsOf('CTX PER PIS REV')).toEqual({
      set: 2,
      started: ['Planteo → Marco • Hecho, 0'],
      waiting: ['Hecho → • CRI HallazgoOpc, 2', 'Hecho → • HAL, 2'],
    });
  });

  it('the empty story: nothing started, only what a story can begin with', () => {
    expect(openItemsOf('')).toEqual({
      set: 0,
      started: [],
      waiting: [
        'Hecho → • CRI HallazgoOpc, 0',
        'Hecho → • HAL, 0',
        'Marco → • CTX PerOpc, 0',
        'Marco → • PER CtxOpc, 0',
      ],
    });
  });

  it('a tag outside Σ stops before Earley: no chart, no open items', () => {
    expect(openItemsOf('CRI XYZ')).toBeNull();
  });

  it('an accepted story has no open items to report', () => {
    expect(parse({ grammar: g1, input: 'CRI PIS REV' })).not.toHaveProperty('openItems');
  });
});
