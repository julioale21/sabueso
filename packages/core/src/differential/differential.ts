/**
 * Concept: differential testing: three recognizers built in different ways (Earley on G, CYK
 * on the Chomsky normal form of G, the pushdown automaton of G) must accept exactly the same
 * strings. Any disagreement means a bug in one of them.
 * Reference: SPEC 02, section 9.4.
 * Card: docs/concepts/23-cocke-younger-kasami.md
 */
import { toChomskyNormalForm } from '../chomsky-normal-form/index.js';
import { recognizeCockeYoungerKasami } from '../cocke-younger-kasami/recognizer.js';
import { recognize } from '../earley/recognizer.js';
import type { Grammar, SymbolName } from '../grammar/types.js';
import { simulatePushdownAutomaton, type PushdownRun } from '../pushdown-automaton/simulate.js';

/** A string on which the three recognizers do not all agree. */
export interface Discrepancy {
  tokens: SymbolName[];
  earley: boolean;
  cockeYoungerKasami: boolean;
  pushdownAutomaton: PushdownRun['result'];
}

/** How many strings were tried, how many are sentences, and every disagreement. */
export interface DifferentialReport {
  strings: number;
  accepted: number;
  discrepancies: Discrepancy[];
}

/** Every string over the alphabet of length 0 to maxLength, shortest first. */
export function allStrings({
  alphabet,
  maxLength,
}: {
  alphabet: readonly SymbolName[];
  maxLength: number;
}): SymbolName[][] {
  // Length by length: the strings of length l are those of length l − 1 with one more
  // symbol at the end. With |Σ| symbols there are |Σ|^l of them.
  const strings: SymbolName[][] = [[]];
  let previous: SymbolName[][] = [[]];
  for (let length = 1; length <= maxLength; length++) {
    previous = previous.flatMap((prefix) => alphabet.map((symbol) => [...prefix, symbol]));
    strings.push(...previous);
  }
  return strings;
}

/**
 * Runs Earley, CYK and the pushdown automaton on every string over the alphabet (Σ of the
 * grammar by default) of length ≤ maxLength. The automaton must answer accept or reject;
 * 'undetermined' also counts as a disagreement.
 */
export function runDifferential({
  grammar,
  maxLength,
  alphabet = [...grammar.terminals],
}: {
  grammar: Grammar;
  maxLength: number;
  /** The symbols to build strings from; Σ of the grammar if not given. */
  alphabet?: readonly SymbolName[] | undefined;
}): DifferentialReport {
  // The normal form is computed once: CYK only accepts a grammar already converted.
  const normalForm = toChomskyNormalForm(grammar).grammar;
  const strings = allStrings({ alphabet, maxLength });
  const discrepancies: Discrepancy[] = [];
  let accepted = 0;
  for (const tokens of strings) {
    const earley = recognize({ grammar, tokens }).accepted;
    const cockeYoungerKasami = recognizeCockeYoungerKasami({
      grammar: normalForm,
      tokens,
    }).accepted;
    const pushdownAutomaton = simulatePushdownAutomaton({ grammar, tokens }).result;
    if (earley) {
      accepted++;
    }
    if (cockeYoungerKasami !== earley || pushdownAutomaton !== (earley ? 'accept' : 'reject')) {
      discrepancies.push({ tokens, earley, cockeYoungerKasami, pushdownAutomaton });
    }
  }
  return { strings: strings.length, accepted, discrepancies };
}
