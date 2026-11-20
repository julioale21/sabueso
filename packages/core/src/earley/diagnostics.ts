/**
 * Concept: why a story is rejected, as data: where it fails, what was found and what was expected.
 * Reference: SPEC 02, section 3.17.
 *
 * Step 6 only needs the type, for the unknown-symbol error of the alphabet check. Step 16 adds
 * the functions that build the other two kinds from the Earley chart.
 */
import type { SymbolName } from '../grammar/types.js';

export interface ParseError {
  /**
   * - 'unknown-symbol': the token is not in Σ (checked before Earley runs).
   * - 'unexpected-token': the token is in Σ, but no item of the chart can read it.
   * - 'unexpected-end': the story ends before it is complete.
   */
  kind: 'unexpected-token' | 'unexpected-end' | 'unknown-symbol';
  /** Index of the token, starting at 0. The console shows it as "event position + 1". */
  position: number;
  /** The token at that position, or null at the end of the input. */
  found: SymbolName | null;
  /** The terminals that would have been valid there, sorted alphabetically. */
  expected: SymbolName[];
}
