/**
 * Concept: comparing two languages up to a length k: the sentences that only one of the two
 * grammars generates. The equivalence of two CFGs is undecidable; a difference found up to k
 * proves L(G) ≠ L(H), but finding none proves nothing.
 * Guide: docs/guides/27-busquedas-acotadas.md
 */
import type { Grammar, SymbolName } from '../grammar/types.js';
import { generateSentences } from './generate.js';

/** The sentences of length ≤ maxLength that only one of the two grammars generates. */
export interface LanguageComparison {
  onlyInFirst: SymbolName[][];
  onlyInSecond: SymbolName[][];
  maxLength: number;
}

/** L(first) − L(second) and L(second) − L(first), restricted to length ≤ maxLength. */
export function compareLanguages({
  first,
  second,
  maxLength,
}: {
  first: Grammar;
  second: Grammar;
  /** k: the longest sentence to compare. */
  maxLength: number;
}): LanguageComparison {
  const firstSentences = generateSentences({ grammar: first, maxLength });
  const secondSentences = generateSentences({ grammar: second, maxLength });
  return {
    onlyInFirst: missingFrom({ sentences: firstSentences, others: secondSentences }),
    onlyInSecond: missingFrom({ sentences: secondSentences, others: firstSentences }),
    maxLength,
  };
}

/** The sentences of the first list that the second does not have, in the same order. */
function missingFrom({
  sentences,
  others,
}: {
  sentences: readonly SymbolName[][];
  others: readonly SymbolName[][];
}): SymbolName[][] {
  const otherKeys = new Set(others.map((sentence) => sentence.join(' ')));
  return sentences.filter((sentence) => !otherKeys.has(sentence.join(' ')));
}
