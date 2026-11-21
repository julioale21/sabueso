/**
 * Concept: productive, reachable and useless symbols, and the emptiness of L(G).
 * Reference: Hopcroft 7.1.1, 7.1.2 and 7.4.3; SPEC 02, section 3.8.
 * Card: docs/concepts/08-useless-symbols-and-emptiness.md
 */
import { buildGrammar } from '../grammar/build.js';
import type { Grammar, Production, SymbolName } from '../grammar/types.js';
import {
  repeatRuleUntilNoChange,
  nonterminalsWithProductionThat,
  type RoundListener,
} from './fixed-point.js';

/** The two fixed points, in the order they run. */
export type UsefulPhase = 'productive' | 'reachable';

/** Called after each round of each phase with the set found so far. */
export type UsefulIterationObserver = (
  phase: UsefulPhase,
  iteration: number,
  symbols: ReadonlySet<SymbolName>,
) => void;

export interface UsefulSymbolsAnalysis {
  /** The nonterminals that derive some string of terminals: A ⇒* w, w ∈ Σ*. */
  productive: Set<SymbolName>;
  /** The nonterminals reachable from S once the non-productive ones are removed. */
  reachable: Set<SymbolName>;
  /** The nonterminals that are not productive or not reachable. */
  useless: Set<SymbolName>;
  /** L(G) = ∅: the start symbol is not productive. */
  isEmpty: boolean;
  /** G without its useless symbols, with the same language; null when L(G) = ∅. */
  usefulGrammar: Grammar | null;
}

/**
 * Finds the useless symbols in the order of Hopcroft 7.1.1: first the productive ones, then,
 * using only the productions left, the reachable ones. The other order can leave a useless
 * symbol behind.
 */
export function analyzeUsefulSymbols(
  grammar: Grammar,
  onRound?: UsefulIterationObserver,
): UsefulSymbolsAnalysis {
  // A symbol is useful if it appears in some derivation S ⇒* … ⇒* w of a sentence.
  // Both conditions are needed: deriving terminals AND being reachable from S.
  // Order matters: removing the non-productive symbols drops productions, which can
  // leave another symbol unreachable. So "reachable" is computed on what is left.
  const productive = computeProductive(grammar, ({ round, symbolsSoFar }) =>
    onRound?.('productive', round, symbolsSoFar),
  );
  // Emptiness (decidable): L(G) = ∅ ⇔ S is not productive. No sentences, nothing useful.
  const isEmpty = !productive.has(grammar.start);
  const productions = grammar.productions.filter((production) =>
    usesOnly(production, productive, grammar),
  );
  const reachable = isEmpty
    ? new Set<SymbolName>()
    : computeReachable(grammar.start, productions, ({ round, symbolsSoFar }) =>
        onRound?.('reachable', round, symbolsSoFar),
      );
  const useless = new Set(
    [...grammar.nonterminals].filter((symbol) => !productive.has(symbol) || !reachable.has(symbol)),
  );
  return {
    productive,
    reachable,
    useless,
    isEmpty,
    usefulGrammar: isEmpty ? null : buildUsefulGrammar(grammar, productions, reachable),
  };
}

/**
 * The productive nonterminals, by least fixed point: A is productive if some production
 * A → X1…Xk has every Xi a terminal or a productive nonterminal.
 */
export function computeProductive(grammar: Grammar, onRound?: RoundListener): Set<SymbolName> {
  // Like nullable, with another base: a terminal already "produces" (it is a string of Σ*).
  // Round 1: the A with a right side of only terminals (or ε).
  return repeatRuleUntilNoChange({
    start: [],
    newSymbolsOfRound: (productive) =>
      nonterminalsWithProductionThat(grammar.productions, (production) =>
        usesOnly(production, productive, grammar),
      ),
    onRound,
  });
}

/**
 * The nonterminals reachable from the start symbol through the given productions. Round i
 * adds the nonterminals at distance i from S.
 */
export function computeReachable(
  start: SymbolName,
  productions: readonly Production[],
  onRound?: RoundListener,
): Set<SymbolName> {
  // The same fixed point, now top-down: start from {S}, and each round adds the
  // nonterminals in the right sides of those already reached (S ⇒* αAβ).
  const nonterminals = new Set(productions.map((production) => production.leftSide));
  return repeatRuleUntilNoChange({
    start: [start],
    newSymbolsOfRound: (reachable) => nonterminalsUsedBy(reachable, productions, nonterminals),
    onRound,
  });
}

/** The nonterminals in the right sides of the productions of the given symbols. */
function nonterminalsUsedBy(
  symbols: ReadonlySet<SymbolName>,
  productions: readonly Production[],
  nonterminals: ReadonlySet<SymbolName>,
): SymbolName[] {
  return productions
    .filter((production) => symbols.has(production.leftSide))
    .flatMap((production) => production.rightSide)
    .filter((symbol) => nonterminals.has(symbol));
}

/** True when every symbol of the right side is a terminal or one of the given nonterminals. */
function usesOnly(
  production: Production,
  nonterminals: ReadonlySet<SymbolName>,
  grammar: Grammar,
): boolean {
  return production.rightSide.every(
    (symbol) => grammar.terminals.has(symbol) || nonterminals.has(symbol),
  );
}

/** The productions left after both removals, built again as a grammar (new ids, smaller Σ). */
function buildUsefulGrammar(
  grammar: Grammar,
  productiveProductions: readonly Production[],
  reachable: ReadonlySet<SymbolName>,
): Grammar {
  const rules = productiveProductions
    .filter((production) => reachable.has(production.leftSide))
    .map(({ leftSide, rightSide }) => ({ leftSide, rightSide }));
  return buildGrammar(`${grammar.name} without useless symbols`, rules, grammar.start);
}
