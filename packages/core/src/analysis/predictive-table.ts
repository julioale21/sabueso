/**
 * Concept: the LL(1) predictive table M[A, a] and its conflicts. A grammar is LL(1) when no
 * cell has two productions, and every LL(1) grammar is unambiguous.
 * Reference: Aho, Lam, Sethi and Ullman, Compilers (2nd ed.), 4.4.3; SPEC 02, section 3.6.
 * Card: docs/concepts/06-predictive-table-and-unambiguity.md
 */
import type { Grammar, Production, SymbolName } from '../grammar/types.js';
import {
  EMPTY_STRING,
  computeFirstFollow,
  firstOfSequence,
  type FirstFollowSets,
} from './first-follow.js';

/** A cell M[A, a] that received more than one production: one token is not enough to choose. */
export interface PredictiveTableConflict {
  nonterminal: SymbolName;
  lookahead: SymbolName;
  productions: Production[];
}

export interface PredictiveTable {
  /** M[A, a]: for each nonterminal A and lookahead a, the productions to use. Empty cells are missing. */
  table: Map<SymbolName, Map<SymbolName, Production[]>>;
  /** The cells with more than one production, row by row. */
  conflicts: PredictiveTableConflict[];
  /** True when there are no conflicts: the grammar is LL(1). */
  isPredictive: boolean;
}

/**
 * Builds M[A, a]: for each production A → α, it goes in the cell of every terminal of
 * FIRST(α) and, if α can derive ε, in the cell of every member of FOLLOW(A) ($ included).
 */
export function buildPredictiveTable(
  grammar: Grammar,
  sets: FirstFollowSets = computeFirstFollow({ grammar }),
): PredictiveTable {
  // The table writes down, before reading any input, the decision an LL(1) parser takes:
  // "I am expanding A and the next token is a: use this production". A cell with two
  // productions means the parser would have to guess: that is a conflict.
  const table = new Map<SymbolName, Map<SymbolName, Production[]>>();
  for (const nonterminal of grammar.nonterminals) {
    table.set(nonterminal, new Map());
  }
  for (const production of grammar.productions) {
    const row = table.get(production.leftSide);
    for (const lookahead of predictionSet(production, sets)) {
      row?.set(lookahead, [...(row.get(lookahead) ?? []), production]);
    }
  }
  const conflicts = findConflicts(table);
  return { table, conflicts, isPredictive: conflicts.length === 0 };
}

/**
 * The lookaheads that select A → α: FIRST(α) without ε and, if α can derive ε, FOLLOW(A).
 * Two productions of the same A conflict exactly when their prediction sets overlap.
 */
export function predictionSet(production: Production, sets: FirstFollowSets): Set<SymbolName> {
  const firstOfRightSide = firstOfSequence({ symbols: production.rightSide, first: sets.first });
  const lookaheads = new Set([...firstOfRightSide].filter((member) => member !== EMPTY_STRING));
  if (firstOfRightSide.has(EMPTY_STRING)) {
    for (const member of sets.follow.get(production.leftSide) ?? []) {
      lookaheads.add(member);
    }
  }
  return lookaheads;
}

/** Every cell with more than one production, in the order of the rows and of the cells. */
function findConflicts(
  table: ReadonlyMap<SymbolName, ReadonlyMap<SymbolName, Production[]>>,
): PredictiveTableConflict[] {
  const conflicts: PredictiveTableConflict[] = [];
  for (const [nonterminal, row] of table) {
    for (const [lookahead, productions] of row) {
      if (productions.length > 1) {
        conflicts.push({ nonterminal, lookahead, productions });
      }
    }
  }
  return conflicts;
}
