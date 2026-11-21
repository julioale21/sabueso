/**
 * Concept: the full analysis of a grammar, steps 7 to 12 in one result: nullable symbols,
 * minimum yield, useless symbols and emptiness, cycles, FIRST and FOLLOW, and the LL(1) table.
 * Reference: SPEC 02, sections 3.5 to 3.10.
 */
import type { Grammar, SymbolName } from '../grammar/types.js';
import { findCycles } from './cycles.js';
import { computeFirstFollow, type FirstFollowSets } from './first-follow.js';
import { computeMinYield } from './min-yield.js';
import { computeNullable } from './nullable.js';
import { buildPredictiveTable, type PredictiveTable } from './predictive-table.js';
import { analyzeUsefulSymbols } from './useful.js';

export interface GrammarAnalysis extends FirstFollowSets {
  nullableSymbols: Set<SymbolName>;
  minYield: Map<SymbolName, number>;
  productive: Set<SymbolName>;
  reachable: Set<SymbolName>;
  useless: Set<SymbolName>;
  /** L(G) = ∅. */
  isEmpty: boolean;
  /** Every cycle A ⇒+ A found; empty when the grammar has none. */
  cycles: SymbolName[][];
  predictiveTable: PredictiveTable;
}

/** Runs every analysis of steps 7 to 12 on the grammar. */
export function analyzeGrammar(grammar: Grammar): GrammarAnalysis {
  const useful = analyzeUsefulSymbols(grammar);
  const sets = computeFirstFollow(grammar);
  return {
    nullableSymbols: computeNullable(grammar),
    minYield: computeMinYield(grammar),
    productive: useful.productive,
    reachable: useful.reachable,
    useless: useful.useless,
    isEmpty: useful.isEmpty,
    cycles: findCycles(grammar),
    first: sets.first,
    follow: sets.follow,
    predictiveTable: buildPredictiveTable({ grammar, sets }),
  };
}
