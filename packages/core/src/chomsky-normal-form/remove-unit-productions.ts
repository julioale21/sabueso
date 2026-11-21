/**
 * Concept: UNIT, the step of the Chomsky normal form that removes the unit productions
 * A → B, using the unit pairs.
 * Card: docs/concepts/22-chomsky-normal-form.md
 */
import { lastRound, repeatRuleUntilNoChange } from '../analysis/fixed-point.js';
import type { Grammar, Production, SymbolName } from '../grammar/types.js';
import { rewriteGrammar } from './rewrite.js';

/**
 * The unit pairs of each nonterminal: (A, B) when A ⇒* B using only unit productions.
 * (A, A) is always a pair, with zero steps. Expects a grammar without ε-productions
 * (after DEL), so that a unit step is exactly a production A → B.
 */
export function computeUnitPairs(grammar: Grammar): Map<SymbolName, Set<SymbolName>> {
  // Hopcroft's induction is the same least fixed point as nullable, from {A}:
  // base (A, A); if (A, B) is a pair and B → C is a production, (A, C) is a pair.
  // It stops because the set only grows and is bounded by |N|.
  const unitPairs = new Map<SymbolName, Set<SymbolName>>();
  for (const nonterminal of grammar.nonterminals) {
    const rounds = repeatRuleUntilNoChange({
      start: [nonterminal],
      newSymbolsOfRound: (reachedSymbols) => unitTargets({ grammar, reachedSymbols }),
    });
    unitPairs.set(nonterminal, lastRound(rounds));
  }
  return unitPairs;
}

/** The rule of a round: the B of every unit production A → B whose A was already reached. */
function unitTargets({
  grammar,
  reachedSymbols,
}: {
  grammar: Grammar;
  /** The nonterminals reached at the end of the previous round. */
  reachedSymbols: ReadonlySet<SymbolName>;
}): SymbolName[] {
  return grammar.productions
    .filter(
      (production) => reachedSymbols.has(production.leftSide) && isUnit({ production, grammar }),
    )
    .map((production) => production.rightSide[0] ?? '');
}

/**
 * G' without unit productions and with the same language: for each unit pair (A, B) and each
 * production B → α that is not unit, A → α. The unit productions are not copied.
 */
export function removeUnitProductions(grammar: Grammar): Grammar {
  // UNIT: a derivation A ⇒ B ⇒ … ⇒ C ⇒ α, with only unit steps before the last, is
  // replaced by the single step A → α. This also breaks the cycles A ⇒+ A: they are made
  // of unit steps, and no unit step is left.
  const unitPairs = computeUnitPairs(grammar);
  const productions = [...grammar.nonterminals].flatMap((nonterminal) =>
    [...(unitPairs.get(nonterminal) ?? [])].flatMap((target) =>
      (grammar.productionsByLeftSide.get(target) ?? [])
        .filter((production) => !isUnit({ production, grammar }))
        .map((production) => ({ leftSide: nonterminal, rightSide: production.rightSide })),
    ),
  );
  return rewriteGrammar({ grammar, productions });
}

/** A → B with B a nonterminal: a step that only renames, without producing anything. */
export function isUnit({
  production,
  grammar,
}: {
  production: Production;
  grammar: Grammar;
}): boolean {
  const [only] = production.rightSide;
  return production.rightSide.length === 1 && only !== undefined && grammar.nonterminals.has(only);
}
