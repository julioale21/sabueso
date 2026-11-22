/**
 * Concept: how long each stage of the analysis of one story takes: recognition (the chart),
 * one tree, its leftmost derivation and the tree count.
 * Guide: docs/guides/28-pruebas-diferenciales-y-rendimiento.md
 */
import { recognize } from '../earley/recognizer.js';
import type { Grammar, SymbolName } from '../grammar/types.js';
import { countTrees } from '../trees/count.js';
import { leftmostDerivation } from '../trees/derivation.js';
import { parseTrees } from '../trees/enumerate.js';
import type { TreeCount } from '../trees/tree.js';

/** The time of each stage, in milliseconds, and what each one produced. */
export interface BenchmarkResult {
  events: number;
  accepted: boolean;
  /** Items in the whole chart: the work of the recognizer. */
  items: number;
  recognitionMs: number;
  /** null when the story is rejected (no tree, no derivation). */
  treeMs: number | null;
  derivationMs: number | null;
  countMs: number;
  treeCount: TreeCount;
}

/** Times recognize, the first tree, its derivation and countTrees, without trace. */
export function benchmark({
  grammar,
  tokens,
  clock = () => performance.now(),
}: {
  grammar: Grammar;
  tokens: readonly SymbolName[];
  /** The clock, in milliseconds; injected in the tests. */
  clock?: (() => number) | undefined;
}): BenchmarkResult {
  const timed = <T>(work: () => T): { value: T; ms: number } => {
    const started = clock();
    const value = work();
    return { value, ms: clock() - started };
  };
  const recognition = timed(() => recognize({ grammar, tokens }));
  const items = recognition.value.chart.reduce((total, set) => total + set.items.length, 0);
  const count = timed(() => countTrees({ grammar, recognition: recognition.value }));
  if (!recognition.value.accepted) {
    return {
      events: tokens.length,
      accepted: false,
      items,
      recognitionMs: recognition.ms,
      treeMs: null,
      derivationMs: null,
      countMs: count.ms,
      treeCount: count.value,
    };
  }
  const tree = timed(() => parseTrees({ grammar, recognition: recognition.value, limit: 1 })[0]);
  const derivation = timed(() => (tree.value === undefined ? [] : leftmostDerivation(tree.value)));
  return {
    events: tokens.length,
    accepted: true,
    items,
    recognitionMs: recognition.ms,
    treeMs: tree.ms,
    derivationMs: derivation.ms,
    countMs: count.ms,
    treeCount: count.value,
  };
}
