/**
 * Concept: the whole analysis of a story in one call: the alphabet check, Earley, the
 * diagnosis, the trees, their count and the leftmost derivation of the first one. It is
 * what the web (SPEC 03) calls.
 * Reference: SPEC 02, sections 3.17 to 3.22 and section 5.
 */
import type { ParseError } from './earley/diagnostics.js';
import { diagnose } from './earley/diagnostics.js';
import type { Chart } from './earley/chart.js';
import { recognize } from './earley/recognizer.js';
import type { TraceEvent } from './earley/trace.js';
import type { Grammar, SymbolName } from './grammar/types.js';
import { checkAlphabet, tokenizeSequence } from './input/sequence.js';
import { countTrees } from './trees/count.js';
import { leftmostDerivation, type DerivationStep } from './trees/derivation.js';
import { DEFAULT_TREE_LIMIT, parseTrees } from './trees/enumerate.js';
import type { ParseTree, TreeCount } from './trees/tree.js';

export interface ParseOptions {
  /** At most this many trees are built (default 50). */
  maxTrees?: number;
  /** Record every step of Earley (default false). */
  trace?: boolean;
  /** Count every tree, even the ones not built (default true). */
  countTrees?: boolean;
  /** Teaching only: the classic algorithm without the ε fix (default false). */
  classicEpsilon?: boolean;
}

export type ParseResult =
  | {
      accepted: true;
      tokens: SymbolName[];
      /** The first trees, up to maxTrees. */
      trees: ParseTree[];
      /** How many trees there are in total, or null if countTrees was false. */
      treeCount: TreeCount | null;
      /** The leftmost derivation of the first tree. */
      derivation: DerivationStep[];
      chart: Chart;
      trace: TraceEvent[];
    }
  | { accepted: false; tokens: SymbolName[]; error: ParseError; chart: Chart; trace: TraceEvent[] };

/**
 * Analyzes a story with a grammar. The story can be the text ('CRI PIS REV') or its tokens.
 * A rejected story comes with its error; an accepted one, with its trees, their count and
 * the derivation of the first tree.
 */
export function parse(
  grammar: Grammar,
  input: string | readonly SymbolName[],
  options: ParseOptions = {},
): ParseResult {
  // Each piece already exists and does one thing; this function only runs them in order.
  // A symbol outside Σ stops everything before Earley runs (there is no chart then).
  const tokens = typeof input === 'string' ? tokenizeSequence(input) : [...input];
  const unknown = checkAlphabet(tokens, grammar);
  if (unknown !== null) {
    return { accepted: false, tokens, error: unknown, chart: [], trace: [] };
  }
  const recognition = recognize(grammar, tokens, {
    trace: options.trace ?? false,
    classicEpsilon: options.classicEpsilon ?? false,
  });
  const { chart, trace } = recognition;
  const error = diagnose(grammar, chart, tokens, recognition.accepted);
  if (error !== null) {
    return { accepted: false, tokens, error, chart, trace };
  }
  const trees = parseTrees(grammar, recognition, options.maxTrees ?? DEFAULT_TREE_LIMIT);
  const [firstTree] = trees;
  return {
    accepted: true,
    tokens,
    trees,
    treeCount: (options.countTrees ?? true) ? countTrees(grammar, recognition) : null,
    derivation: firstTree === undefined ? [] : leftmostDerivation(firstTree),
    chart,
    trace,
  };
}
