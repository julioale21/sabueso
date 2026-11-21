// Helpers to compare languages by brute force: every string up to a length, run through Earley.
import { recognize } from '../../src/earley/recognizer.js';
import type { Grammar, SymbolName } from '../../src/grammar/types.js';

/** Every string over the alphabet of length 0 to maxLength, shortest first. */
export function stringsUpTo({
  alphabet,
  maxLength,
}: {
  alphabet: readonly SymbolName[];
  maxLength: number;
}): SymbolName[][] {
  const strings: SymbolName[][] = [[]];
  let previous: SymbolName[][] = [[]];
  for (let length = 1; length <= maxLength; length++) {
    previous = previous.flatMap((prefix) => alphabet.map((symbol) => [...prefix, symbol]));
    strings.push(...previous);
  }
  return strings;
}

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
