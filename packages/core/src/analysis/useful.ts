/**
 * Concept: productive, reachable and useless symbols, and the emptiness of L(G).
 * Card: docs/concepts/08-useless-symbols-and-emptiness.md
 */
import { buildGrammar } from '../grammar/build.js';
import type { Grammar, Production, SymbolName } from '../grammar/types.js';
import { lastRound, repeatRuleUntilNoChange } from './fixed-point.js';

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
  /** Every round of the productive fixed point (the --steps table); the last is `productive`. */
  productiveRounds: Set<SymbolName>[];
  /** Every round of the reachable fixed point; empty when L(G) = ∅ (it does not run). */
  reachableRounds: Set<SymbolName>[];
}

/**
 * Finds the useless symbols in the textbook order: first the productive ones, then,
 * using only the productions left, the reachable ones. The other order can leave a useless
 * symbol behind.
 */
export function analyzeUsefulSymbols(grammar: Grammar): UsefulSymbolsAnalysis {
  // A symbol is useful if it appears in some derivation S ⇒* … ⇒* w of a sentence.
  // Both conditions are needed: deriving terminals AND being reachable from S.
  // Order matters: removing the non-productive symbols drops productions, which can
  // leave another symbol unreachable. So "reachable" is computed on what is left.
  const productiveRoundList = productiveRounds(grammar);
  const productive = lastRound(productiveRoundList);
  // Emptiness (decidable): L(G) = ∅ ⇔ S is not productive. No sentences, nothing useful.
  const isEmpty = !productive.has(grammar.start);
  const productions = grammar.productions.filter((production) =>
    usesOnly({ production, nonterminals: productive, grammar }),
  );
  const reachableRoundList = isEmpty ? [] : reachableRounds({ start: grammar.start, productions });
  const reachable = isEmpty ? new Set<SymbolName>() : lastRound(reachableRoundList);
  const useless = new Set(
    [...grammar.nonterminals].filter((symbol) => !productive.has(symbol) || !reachable.has(symbol)),
  );
  return {
    productive,
    reachable,
    useless,
    isEmpty,
    usefulGrammar: isEmpty
      ? null
      : buildUsefulGrammar({ grammar, productiveProductions: productions, reachable }),
    productiveRounds: productiveRoundList,
    reachableRounds: reachableRoundList,
  };
}

/**
 * The productive nonterminals, by least fixed point: A is productive if some production
 * A → X1…Xk has every Xi a terminal or a productive nonterminal. Returns every round; the
 * last one is the set of productive nonterminals.
 */
export function productiveRounds(grammar: Grammar): Set<SymbolName>[] {
  // Like nullable, with another base: a terminal already "produces" (it is a string of Σ*).
  // Round 1: the A with a right side of only terminals (or ε).
  return repeatRuleUntilNoChange({
    start: [],
    newSymbolsOfRound: (productiveSymbols) => newProductiveSymbols({ grammar, productiveSymbols }),
  });
}

/** The rule of a round: the left sides of the productions that only use terminals and what is known. */
function newProductiveSymbols({
  grammar,
  productiveSymbols,
}: {
  grammar: Grammar;
  /** The symbols known to be productive at the end of the previous round. */
  productiveSymbols: ReadonlySet<SymbolName>;
}): SymbolName[] {
  return grammar.productions
    .filter((production) => usesOnly({ production, nonterminals: productiveSymbols, grammar }))
    .map((production) => production.leftSide);
}

/**
 * The nonterminals reachable from the start symbol through the given productions. Round i
 * adds the nonterminals at distance i from S.
 */
export function computeReachable({
  start,
  productions,
}: {
  /** The start symbol S, reachable with zero steps. */
  start: SymbolName;
  /** The productions to follow (in analyzeUsefulSymbols, only the productive ones). */
  productions: readonly Production[];
}): Set<SymbolName> {
  return lastRound(reachableRounds({ start, productions }));
}

/** Every round of the reachable fixed point; the last one is the result. */
export function reachableRounds({
  start,
  productions,
}: {
  /** The start symbol S, reachable with zero steps. */
  start: SymbolName;
  /** The productions to follow (in analyzeUsefulSymbols, only the productive ones). */
  productions: readonly Production[];
}): Set<SymbolName>[] {
  // The same fixed point, now top-down: start from {S}, and each round adds the
  // nonterminals in the right sides of those already reached (S ⇒* αAβ).
  const nonterminals = new Set(productions.map((production) => production.leftSide));
  return repeatRuleUntilNoChange({
    start: [start],
    newSymbolsOfRound: (reachableSymbols) =>
      nonterminalsUsedBy({ symbols: reachableSymbols, productions, nonterminals }),
  });
}

/** The nonterminals in the right sides of the productions of the given symbols. */
function nonterminalsUsedBy({
  symbols,
  productions,
  nonterminals,
}: {
  symbols: ReadonlySet<SymbolName>;
  productions: readonly Production[];
  /** N, to tell the nonterminals of a right side from its terminals. */
  nonterminals: ReadonlySet<SymbolName>;
}): SymbolName[] {
  return productions
    .filter((production) => symbols.has(production.leftSide))
    .flatMap((production) => production.rightSide)
    .filter((symbol) => nonterminals.has(symbol));
}

/** True when every symbol of the right side is a terminal or one of the given nonterminals. */
function usesOnly({
  production,
  nonterminals,
  grammar,
}: {
  production: Production;
  /** The nonterminals allowed on the right side (the productive ones found so far). */
  nonterminals: ReadonlySet<SymbolName>;
  grammar: Grammar;
}): boolean {
  return production.rightSide.every(
    (symbol) => grammar.terminals.has(symbol) || nonterminals.has(symbol),
  );
}

/** The productions left after both removals, built again as a grammar (new ids, smaller Σ). */
function buildUsefulGrammar({
  grammar,
  productiveProductions,
  reachable,
}: {
  grammar: Grammar;
  /** The productions that use only terminals and productive nonterminals. */
  productiveProductions: readonly Production[];
  reachable: ReadonlySet<SymbolName>;
}): Grammar {
  const rules = productiveProductions
    .filter((production) => reachable.has(production.leftSide))
    .map(({ leftSide, rightSide }) => ({ leftSide, rightSide }));
  return buildGrammar({
    name: `${grammar.name} without useless symbols`,
    rules,
    start: grammar.start,
  });
}
