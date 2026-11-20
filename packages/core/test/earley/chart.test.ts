// The Earley sets: append-only lists with an index by key (step 13).
import { describe, expect, it } from 'vitest';
import { addItem, createChart } from '../../src/earley/chart.js';
import { createItem, type Link } from '../../src/earley/item.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

const arithmetic = loadBuiltInGrammar('arithmetic');
const [sum, single] = arithmetic.productions as [
  (typeof arithmetic.productions)[number],
  (typeof arithmetic.productions)[number],
];

describe('createChart', () => {
  it('an input of n tokens has n + 1 sets, S0 … Sn, all empty', () => {
    const chart = createChart(3);
    expect(chart.map((set) => set.index)).toEqual([0, 1, 2, 3]);
    expect(chart.every((set) => set.items.length === 0)).toBe(true);
  });

  it('an empty input still has S0', () => {
    expect(createChart(0)).toHaveLength(1);
  });
});

describe('addItem', () => {
  it('adds a new item at the end of the list and indexes it by key', () => {
    const [set] = createChart(0);
    const first = addItem(set!, sum, 0, 0);
    const second = addItem(set!, single, 0, 0);
    expect(first.isNew).toBe(true);
    expect(set?.items.map((item) => item.key)).toEqual(['0:0:0', '1:0:0']);
    expect(set?.byKey.get('1:0:0')).toBe(second.item);
  });

  it('the same production, dot and origin is the same item: it is not added twice', () => {
    const [set] = createChart(0);
    const first = addItem(set!, sum, 0, 0);
    const again = addItem(set!, sum, 0, 0);
    expect(again.isNew).toBe(false);
    expect(again.item).toBe(first.item);
    expect(set?.items).toHaveLength(1);
  });

  it('a different origin makes a different item', () => {
    const [set] = createChart(0);
    addItem(set!, sum, 0, 0);
    addItem(set!, sum, 0, 1);
    expect(set?.items).toHaveLength(2);
  });

  it('a second way to reach an item adds one more link: that is how ambiguity is kept', () => {
    const chart = createChart(1);
    const predecessor = createItem(sum, 0, 0, 0);
    const firstLink: Link = { kind: 'scan', predecessor, tokenIndex: 0 };
    const secondLink: Link = { kind: 'nullable', predecessor, symbol: 'E' };
    addItem(chart[1]!, sum, 1, 0, firstLink);
    const { item } = addItem(chart[1]!, sum, 1, 0, secondLink);
    expect(item.links).toEqual([firstLink, secondLink]);
  });

  it('links are appended without looking for repeats: the algorithm never builds one twice', () => {
    const [set] = createChart(0);
    const link: Link = { kind: 'nullable', predecessor: createItem(sum, 0, 0, 0), symbol: 'E' };
    addItem(set!, sum, 1, 0, link);
    addItem(set!, sum, 1, 0, link);
    expect(set?.byKey.get('0:1:0')?.links).toHaveLength(2);
  });

  it('the new item gets the index of its set', () => {
    const chart = createChart(2);
    expect(addItem(chart[2]!, single, 1, 0).item.setIndex).toBe(2);
  });
});
