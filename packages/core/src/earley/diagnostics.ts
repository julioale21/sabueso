/**
 * Concept: why a story is rejected, as data: where it fails, what was found and what was
 * expected, and which Earley items were left open there. Read straight from the Earley chart.
 * Guides: docs/guides/16-diagnostico-de-errores.md, 13-earley-items-y-conjuntos.md
 */
import type { Grammar, SymbolName } from '../grammar/types.js';
import type { Chart, EarleySet } from './chart.js';
import { isComplete, nextSymbol, type EarleyItem } from './item.js';

export interface ParseError {
  /**
   * - 'unknown-symbol': the token is not in Σ (checked before Earley runs).
   * - 'unexpected-token': the token is in Σ, but no item of the chart could read it.
   * - 'unexpected-end': the story ends before it is complete.
   */
  kind: 'unexpected-token' | 'unexpected-end' | 'unknown-symbol';
  /** Index of the token, starting at 0. The console shows it as "event position + 1". */
  position: number;
  /** The token at that position, or null at the end of the input. */
  found: SymbolName | null;
  /** The terminals that would have been valid there, sorted alphabetically. */
  expected: SymbolName[];
}

/**
 * The error of a rejected input, or null if it was accepted.
 *
 * - If some set S(k+1) is empty, no item of Sk could read token k: the error is at k,
 *   found is token k, and expected are the terminals right after the dot in Sk.
 * - If no set is empty but the input was not accepted, it ended too soon: the error is
 *   at n (the end), found is null, and expected are the terminals after the dot in Sn.
 */
export function diagnose({
  grammar,
  chart,
  tokens,
  accepted,
}: {
  grammar: Grammar;
  chart: Chart;
  tokens: readonly SymbolName[];
  accepted: boolean;
}): ParseError | null {
  // The chart already holds the answer. Each set Sk lists every possibility still alive
  // at position k, and the terminals right after their dots are exactly the tokens that
  // could come next. The first empty set marks the token that nothing could read.
  if (accepted) {
    return null;
  }
  const firstEmpty = chart.findIndex((set, index) => index > 0 && set.items.length === 0);
  if (firstEmpty !== -1) {
    const position = firstEmpty - 1;
    return {
      kind: 'unexpected-token',
      position,
      found: tokens[position] ?? null,
      expected: expectedTerminals({ grammar, set: chart[position] }),
    };
  }
  return {
    kind: 'unexpected-end',
    position: tokens.length,
    found: null,
    expected: expectedTerminals({ grammar, set: chart[tokens.length] }),
  };
}

/**
 * The terminals right after the dot in the items of a set, without repeats and sorted:
 * the tokens that would have kept some possibility alive at that position.
 */
export function expectedTerminals({
  grammar,
  set,
}: {
  grammar: Grammar;
  set?: EarleySet | undefined;
}): SymbolName[] {
  const terminals = new Set<SymbolName>();
  for (const item of set?.items ?? []) {
    const next = nextSymbol(item);
    if (next !== undefined && grammar.terminals.has(next)) {
      terminals.add(next);
    }
  }
  return [...terminals].sort();
}

/**
 * The Earley items still open in the set where a story fails. A rejected story has no tree,
 * but the chart says which structures had started and what could have come next.
 */
export interface OpenItems {
  /** k: the set S_k where the story failed (the position of the error). */
  set: number;
  /** Structures already started (something before the dot) that could not go on. */
  started: EarleyItem[];
  /** Predicted rules (dot 0) that would have read one of the expected tags. */
  waiting: EarleyItem[];
}

/**
 * The open items of the set where the story failed, or null when Earley did not run (a tag
 * outside Σ stops the analysis before it).
 */
export function openItemsAt({
  chart,
  error,
}: {
  chart: Chart;
  error: ParseError;
}): OpenItems | null {
  // S_k holds every item that reached the error position. The incomplete ones are the open
  // structures: with something before the dot, a part of the story that had started; with
  // the dot at the start, a rule predicted there, and it matters if it would read one of the
  // expected tags (those are where "se esperaba: …" comes from).
  const set = chart[error.position];
  if (set === undefined) {
    return null;
  }
  const expected = new Set(error.expected);
  const open = set.items.filter((item) => !isComplete(item));
  return {
    set: error.position,
    started: open.filter((item) => item.dot > 0),
    waiting: open.filter((item) => item.dot === 0 && expected.has(nextSymbol(item) ?? '')),
  };
}
