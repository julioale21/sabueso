// Helpers to compare languages by brute force: every string up to a length, run through Earley.
import { allStrings } from '../../src/differential/differential.js';
import { recognize } from '../../src/earley/recognizer.js';
import type { Grammar, SymbolName } from '../../src/grammar/types.js';

/** Every string over the alphabet of length 0 to maxLength, shortest first. */
export const stringsUpTo = allStrings;

/** Whether Earley accepts the tokens with the grammar. */
export function accepts({
  grammar,
  tokens,
}: {
  grammar: Grammar;
  tokens: readonly SymbolName[];
}): boolean {
  return recognize({ grammar, tokens }).accepted;
}
