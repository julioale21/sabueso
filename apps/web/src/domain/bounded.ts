/** How the bounded searches are written on screen (card 25): sentences and tree counts. */
import type { TreeCount } from '@sabueso/core';

/** The k the view offers: up to 6 the searches answer at once (SPEC 03, section 3.4). */
export const LENGTH_CHOICES = [1, 2, 3, 4, 5, 6] as const;
export const DEFAULT_LENGTH = 3;

/** How many sentences of each list are shown; the rest only counted. */
export const SENTENCES_SHOWN = 20;

/** A sentence of tags, or ε when empty. */
export function sentenceText(sentence: readonly string[]): string {
  return sentence.length === 0 ? 'ε' : sentence.join(' ');
}

/** '2 árboles', or 'infinitos árboles' for a cycle. */
export function treeCountText(count: TreeCount): string {
  return count === 'infinite' ? 'infinitos árboles' : `${count.toString()} árboles`;
}
