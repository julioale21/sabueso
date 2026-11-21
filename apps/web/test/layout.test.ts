// Positioning the parse tree (SPEC 03, step 7): geometry over a tree that comes from the core.
import type { ParseTree, Production } from '@sabueso/core';
import { describe, expect, it } from 'vitest';
import { createLocalAnalysisService } from '../src/analysis/local-service';
import { allNodes, derivesOnlyEpsilon, layoutTree } from '../src/tree-layout/layout';

const production = (leftSide: string, rightSide: string[]): Production => ({
  id: 0,
  leftSide,
  rightSide,
});
const leaf = (symbol: string, tokenIndex: number): ParseTree => ({
  kind: 'terminal',
  symbol,
  tokenIndex,
});
const node = (symbol: string, children: ParseTree[]): ParseTree => ({
  kind: 'nonterminal',
  symbol,
  production: production(symbol, []),
  children,
});

/** The first tree of A1 with G1, from the core. */
async function a1WithG1(): Promise<ParseTree> {
  const result = await createLocalAnalysisService().analyze('detective/g1', 'CRI SOS PIS INT REV');
  if (!result.accepted || result.trees[0] === undefined) {
    throw new Error('A1 should be accepted by G1');
  }
  return result.trees[0];
}

describe('layoutTree', () => {
  it('a tree with 3 leaves: x = 0, 1, 2 and the root centered at x = 1', () => {
    const layout = layoutTree({
      tree: node('S', [leaf('a', 0), leaf('b', 1), leaf('c', 2)]),
      collapseEpsilon: false,
    });
    expect(layout.root.children.map((child) => child.x)).toEqual([0, 1, 2]);
    expect(layout.root).toMatchObject({ x: 1, y: 0 });
    expect(layout).toMatchObject({ width: 3, height: 2, leafCount: 3 });
  });

  it('a parent sits over the middle of its first and last child', () => {
    const layout = layoutTree({
      tree: node('S', [node('A', [leaf('a', 0), leaf('b', 1)]), leaf('c', 2)]),
      collapseEpsilon: false,
    });
    const [a] = layout.root.children;
    expect(a?.x).toBe(0.5);
    expect(layout.root.x).toBe(1.25);
  });

  it('A1 with G1: no two nodes of the same row share a column', async () => {
    const layout = layoutTree({ tree: await a1WithG1(), collapseEpsilon: false });
    const rows = new Map<number, number[]>();
    for (const each of allNodes(layout.root)) {
      rows.set(each.y, [...(rows.get(each.y) ?? []), each.x]);
    }
    for (const columns of rows.values()) {
      expect(new Set(columns).size).toBe(columns.length);
    }
  });

  it('A1 with G1, collapsing ε: 11 leaves, the 5 tags and 6 collapsed nodes, and 6 nodes fewer', async () => {
    const tree = await a1WithG1();
    const expanded = layoutTree({ tree, collapseEpsilon: false });
    const collapsed = layoutTree({ tree, collapseEpsilon: true });
    const leaves = allNodes(collapsed.root).filter((each) => each.children.length === 0);
    expect(leaves.map((each) => each.label)).toEqual([
      'CRI',
      'HallazgoOpc',
      'MarcoOpc',
      'SOS',
      'PIS',
      'INT',
      'CuerpoLinea',
      'Lineas',
      'REV',
      'Cierre',
      'EpiOpc',
    ]);
    expect(leaves.filter((each) => each.kind === 'collapsed')).toHaveLength(6);
    expect(collapsed.leafCount).toBe(11);
    expect(expanded.leafCount).toBe(11);
    expect(allNodes(expanded.root).length - allNodes(collapsed.root).length).toBe(6);
  });

  it('numbers the expansions in preorder: the order of the leftmost derivation', async () => {
    const layout = layoutTree({ tree: await a1WithG1(), collapseEpsilon: true });
    const pasos = allNodes(layout.root).find((each) => each.label === 'Pasos');
    // Step 7 of the derivation of A1 (index 6) is Pasos → Linea Lineas (SPEC 03, section 7).
    expect(pasos?.expansions).toEqual({ first: 6, last: 6 });
    expect(layout.root.expansions).toEqual({ first: 0, last: 0 });
  });

  it('derivesOnlyEpsilon: true only when the subtree has no terminal', () => {
    expect(derivesOnlyEpsilon(node('A', [{ kind: 'epsilon' }]))).toBe(true);
    expect(derivesOnlyEpsilon(node('A', [leaf('a', 0)]))).toBe(false);
  });
});
