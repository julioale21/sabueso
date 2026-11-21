/**
 * Concept: a witness of ambiguity: the first sentence of length ≤ k with more than one parse
 * tree. Ambiguity is undecidable, but this search semidecides it: if G is ambiguous, some k
 * finds a witness. "None up to k" proves nothing.
 * Reference: Hopcroft 9.5.2; SPEC 02, section 3.25.
 * Card: docs/concepts/25-bounded-searches.md
 */
import { recognize } from '../earley/recognizer.js';
import type { Grammar, SymbolName } from '../grammar/types.js';
import { countTrees } from '../trees/count.js';
import type { TreeCount } from '../trees/tree.js';
import { generateSentences } from './generate.js';

/** A sentence with more than one tree, and how many it has. */
export interface AmbiguityWitness {
  sentence: SymbolName[];
  treeCount: TreeCount;
}

/**
 * The first sentence of length ≤ maxLength with two or more trees, shortest first and then in
 * lexicographic order; null if every sentence up to that length has exactly one.
 */
export function findAmbiguityWitness({
  grammar,
  maxLength,
}: {
  grammar: Grammar;
  /** k: the longest sentence to try. */
  maxLength: number;
}): AmbiguityWitness | null {
  // Generating gives each sentence once; Earley and the tree count (steps 14 and 20) say
  // how many trees it has. The first with more than one is the shortest witness.
  for (const sentence of generateSentences({ grammar, maxLength })) {
    const treeCount = countTrees({
      grammar,
      recognition: recognize({ grammar, tokens: sentence }),
    });
    if (treeCount === 'infinite' || treeCount > 1n) {
      return { sentence, treeCount };
    }
  }
  return null;
}
