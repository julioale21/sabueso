/**
 * Concept: the Earley recognizer: Predictor, Scanner and Completer over the sets S0 … Sn,
 * deciding w ∈ L(G) for any context-free grammar, with the ε fix of Aycock and Horspool.
 * Reference: Earley (1970); Aycock and Horspool, "Practical Earley Parsing" (2002);
 * SPEC 02, sections 3.12 to 3.16.
 * Cards: docs/concepts/13-predictor.md, 14-scanner.md, 15-completer.md,
 * 16-epsilon-aycock-horspool.md
 */
import { computeNullable } from '../analysis/nullable.js';
import {
  AUGMENTED_START,
  type Grammar,
  type Production,
  type SymbolName,
} from '../grammar/types.js';
import { addItem, createChart, type Chart } from './chart.js';
import { itemKey, nextSymbol, type EarleyItem } from './item.js';

export interface RecognitionOptions {
  /**
   * Teaching only: turns the ε fix off, to reproduce the bug of the classic algorithm
   * (epsilon-trap rejects x). False by default.
   */
  classicEpsilon?: boolean;
}

/** What the three operations need besides the item: the grammar, the chart and how to treat ε. */
export interface RecognizerContext {
  grammar: Grammar;
  chart: Chart;
  tokens: readonly SymbolName[];
  /** The nullable nonterminals (step 7); empty in classic mode, so no advance over ε is made. */
  nullable: ReadonlySet<SymbolName>;
  classicEpsilon: boolean;
}

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
export function recognize(
  grammar: Grammar,
  tokens: readonly SymbolName[],
  options: RecognitionOptions = {},
): Recognition {
  // Earley follows every possibility at once. Each item says what it expects next, and
  // exactly one of three operations applies: a nonterminal after the dot is predicted
  // (top-down), a terminal is scanned against the input, and a complete item makes the
  // items that were waiting for it advance (bottom-up).
  const chart = createChart(tokens.length);
  const classicEpsilon = options.classicEpsilon ?? false;
  const context: RecognizerContext = {
    grammar,
    chart,
    tokens,
    nullable: classicEpsilon ? new Set() : computeNullable(grammar),
    classicEpsilon,
  };
  const startProduction = augmentedStartProduction(grammar);
  const firstSet = chart[0];
  if (firstSet !== undefined) {
    addItem(firstSet, startProduction, 0, 0);
  }
  for (const set of chart) {
    for (let position = 0; position < set.items.length; position++) {
      const item = set.items[position];
      if (item !== undefined) {
        processItem(context, item);
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
function processItem(context: RecognizerContext, item: EarleyItem): void {
  const next = nextSymbol(item);
  if (next === undefined) {
    complete(context, item);
  } else if (context.grammar.nonterminals.has(next)) {
    predict(context, item, next);
  } else {
    scan(context, item, next);
  }
}

/**
 * Predictor: (A → α • B β, j) in Sk adds (B → • γ, k) to Sk for each production B → γ.
 * "I will need a B here": every way of building one starts at position k.
 *
 * The ε fix (Aycock and Horspool): if B is nullable, it also adds (A → α B • β, j) right
 * away, with a nullable link, as if B had already been recognized as empty.
 */
export function predict(context: RecognizerContext, item: EarleyItem, symbol: SymbolName): void {
  const set = context.chart[item.setIndex];
  if (set === undefined) {
    return;
  }
  for (const production of context.grammar.productionsByLeftSide.get(symbol) ?? []) {
    addItem(set, production, 0, item.setIndex);
  }
  // The classic algorithm relies on the Completer to advance over an empty B, but the
  // Completer of B → • may have run before this item started to wait for B: then it never
  // advances. Since B is nullable, the advance can be made here, now, without waiting.
  if (context.nullable.has(symbol)) {
    addItem(set, item.production, item.dot + 1, item.origin, {
      kind: 'nullable',
      predecessor: item,
      symbol,
    });
  }
}

/**
 * Scanner: (A → α • a β, j) in Sk adds (A → α a • β, j) to Sk+1 when token k is a.
 * It is the only operation that reads the input.
 */
export function scan(context: RecognizerContext, item: EarleyItem, terminal: SymbolName): void {
  const tokenIndex = item.setIndex;
  const nextSet = context.chart[tokenIndex + 1];
  if (context.tokens[tokenIndex] !== terminal || nextSet === undefined) {
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
 *
 * With the ε fix, an item with i = k (B recognized as empty) is skipped: the Predictor
 * already made every advance over an empty B, and doing it again would add a repeated link.
 */
export function complete(context: RecognizerContext, item: EarleyItem): void {
  if (!context.classicEpsilon && isEmptySpan(item)) {
    return;
  }
  const originSet = context.chart[item.origin];
  const set = context.chart[item.setIndex];
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

/** True for a complete item that started and ended in the same set: it recognized ε. */
export function isEmptySpan(item: EarleyItem): boolean {
  return item.origin === item.setIndex;
}
