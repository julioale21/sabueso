// Counting trees: sums and products of bigint counts, where 'infinite' absorbs.
import { describe, expect, it } from 'vitest';
import { renderTree } from '../../src/trees/render.js';
import { addCounts, multiplyCounts, type ParseTree } from '../../src/trees/tree.js';
import { loadBuiltInGrammar } from '../helpers/load.js';

describe('addCounts and multiplyCounts', () => {
  it('add and multiply exact counts', () => {
    expect(addCounts({ first: 2n, second: 3n })).toBe(5n);
    expect(multiplyCounts({ first: 2n, second: 3n })).toBe(6n);
  });

  it('infinite absorbs a sum and a product', () => {
    expect(addCounts({ first: 'infinite', second: 1n })).toBe('infinite');
    expect(multiplyCounts({ first: 4n, second: 'infinite' })).toBe('infinite');
  });

  it('a zero wins over infinite in a product: no way to build a part, no tree', () => {
    expect(multiplyCounts({ first: 0n, second: 'infinite' })).toBe(0n);
  });

  it('works with huge numbers (bigint)', () => {
    const big = 10n ** 100n;
    expect(multiplyCounts({ first: big, second: big })).toBe(10n ** 200n);
  });
});

describe('renderTree', () => {
  const [hecho] = loadBuiltInGrammar('g1').productionsByLeftSide.get('Hecho') ?? [];
  const [hallazgoEmpty] = (
    loadBuiltInGrammar('g1').productionsByLeftSide.get('HallazgoOpc') ?? []
  ).slice(1);

  it('draws a small tree with ├─, └─ and the bars of open branches', () => {
    if (hecho === undefined || hallazgoEmpty === undefined) throw new Error('missing production');
    const tree: ParseTree = {
      kind: 'nonterminal',
      symbol: 'Hecho',
      production: hecho,
      children: [
        { kind: 'terminal', symbol: 'CRI', tokenIndex: 0 },
        {
          kind: 'nonterminal',
          symbol: 'HallazgoOpc',
          production: hallazgoEmpty,
          children: [{ kind: 'epsilon' }],
        },
      ],
    };
    expect(renderTree(tree)).toBe(['Hecho', '├─ CRI', '└─ HallazgoOpc', '   └─ ε'].join('\n'));
  });
});
