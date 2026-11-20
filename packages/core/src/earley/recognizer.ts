/**
 * Concept: the Earley recognizer: Predictor, Scanner and Completer over the sets S0 … Sn,
 * deciding w ∈ L(G) for any context-free grammar.
 * Reference: Earley (1970); SPEC 02, sections 3.12 to 3.15.
 * Cards: docs/concepts/13-predictor.md, 14-scanner.md, 15-completer.md
 */
import {
  AUGMENTED_START,
  type Grammar,
  type Production,
  type SymbolName,
} from '../grammar/types.js';
import { addItem, createChart, type Chart } from './chart.js';
import { itemKey, nextSymbol, type EarleyItem } from './item.js';

export interface Recognition {
  /** True when ($S → S •, 0) is in the last set: the whole input is a sentence of L(G). */
  accepted: boolean;
  /** The sets S0 … Sn, with every item and its links. */
  chart: Chart;
  /** $S → S, the production added on top of the grammar to know when S is complete. */
  startProduction: Production;
}

/**
 * Runs Earley over the tokens. The tokens must already be in Σ (checkAlphabet, step 6).
 *
 * The sets are processed from S0 to Sn. Each set is walked like a queue: its list grows
 * while it is walked, and the items added along the way are processed too.
 */
export function recognize(grammar: Grammar, tokens: readonly SymbolName[]): Recognition {
  // Earley follows every possibility at once. Each item says what it expects next, and
  // exactly one of three operations applies: a nonterminal after the dot is predicted
  // (top-down), a terminal is scanned against the input, and a complete item makes the
  // items that were waiting for it advance (bottom-up).
  const chart = createChart(tokens.length);
  const startProduction = augmentedStartProduction(grammar);
  const firstSet = chart[0];
  if (firstSet !== undefined) {
    addItem(firstSet, startProduction, 0, 0);
  }
  for (const set of chart) {
    for (let position = 0; position < set.items.length; position++) {
      const item = set.items[position];
      if (item !== undefined) {
        processItem(grammar, chart, tokens, item);
      }
    }
  }
  const lastSet = chart[tokens.length];
  const accepted = lastSet?.byKey.has(itemKey(startProduction, 1, 0)) ?? false;
  return { accepted, chart, startProduction };
}

/**
 * $S → S. Its id is -1 because it is not one of the grammar's productions; '$' is reserved,
 * so no grammar can use $S.
 */
function augmentedStartProduction(grammar: Grammar): Production {
  return { id: -1, leftSide: AUGMENTED_START, rightSide: [grammar.start] };
}

/** Applies the only operation that fits the item: predict, scan or complete. */
function processItem(
  grammar: Grammar,
  chart: Chart,
  tokens: readonly SymbolName[],
  item: EarleyItem,
): void {
  const next = nextSymbol(item);
  if (next === undefined) {
    complete(chart, item);
  } else if (grammar.nonterminals.has(next)) {
    predict(grammar, chart, item, next);
  } else {
    scan(chart, tokens, item, next);
  }
}

/**
 * Predictor: (A → α • B β, j) in Sk adds (B → • γ, k) to Sk for each production B → γ.
 * "I will need a B here": every way of building one starts at position k.
 */
export function predict(
  grammar: Grammar,
  chart: Chart,
  item: EarleyItem,
  symbol: SymbolName,
): void {
  const set = chart[item.setIndex];
  if (set === undefined) {
    return;
  }
  for (const production of grammar.productionsByLeftSide.get(symbol) ?? []) {
    addItem(set, production, 0, item.setIndex);
  }
}

/**
 * Scanner: (A → α • a β, j) in Sk adds (A → α a • β, j) to Sk+1 when token k is a.
 * It is the only operation that reads the input.
 */
export function scan(
  chart: Chart,
  tokens: readonly SymbolName[],
  item: EarleyItem,
  terminal: SymbolName,
): void {
  const tokenIndex = item.setIndex;
  const nextSet = chart[tokenIndex + 1];
  if (tokens[tokenIndex] !== terminal || nextSet === undefined) {
    return; // the input does not continue with this terminal: this possibility dies here
  }
  addItem(nextSet, item.production, item.dot + 1, item.origin, {
    kind: 'scan',
    predecessor: item,
    tokenIndex,
  });
}

/**
 * Completer: (B → γ •, i) in Sk advances every (A → α • B β, j) of Si to (A → α B • β, j)
 * in Sk. "A B was recognized from i to k": whoever was waiting for it at i moves on.
 */
export function complete(chart: Chart, item: EarleyItem): void {
  const originSet = chart[item.origin];
  const set = chart[item.setIndex];
  if (originSet === undefined || set === undefined) {
    return;
  }
  // The origin tells where B started, so only that set can hold items waiting for it.
  // The list is copied: these are the items that were waiting when B was completed.
  for (const waiting of [...originSet.items]) {
    if (nextSymbol(waiting) === item.production.leftSide) {
      addItem(set, waiting.production, waiting.dot + 1, waiting.origin, {
        kind: 'complete',
        predecessor: waiting,
        child: item,
      });
    }
  }
}
