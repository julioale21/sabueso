/**
 * Concept: the Chomsky normal form (FNC): every production is A → B C or A → a, plus S → ε
 * for the start symbol S when ε ∈ L(G). The conversion chains the six steps in order.
 * Card: docs/concepts/22-chomsky-normal-form.md
 */
import type { Grammar, Production } from '../grammar/types.js';
import { addNewStart, appearsOnSomeRightSide } from './add-new-start.js';
import { binarize } from './binarize.js';
import { isolateTerminals } from './isolate-terminals.js';
import { removeEpsilonProductions } from './remove-epsilon-productions.js';
import { removeUnitProductions } from './remove-unit-productions.js';
import { removeUselessSymbols } from './remove-useless-symbols.js';

/** The names of the six steps, as in the theory. */
export type ChomskyNormalFormStepName = 'START' | 'DEL' | 'UNIT' | 'USELESS' | 'TERM' | 'BIN';

/** One step of the conversion: its name and the function that applies it. */
export interface ChomskyNormalFormStep {
  name: ChomskyNormalFormStepName;
  apply: (grammar: Grammar) => Grammar;
}

/**
 * The six steps, in order (where each one comes from is in the card). The order matters: DEL creates unit
 * productions (A → B C with C nullable gives A → B), UNIT and DEL can leave useless symbols,
 * and TERM must go before BIN so that BIN only sees nonterminals.
 */
export const CHOMSKY_NORMAL_FORM_STEPS: readonly ChomskyNormalFormStep[] = [
  { name: 'START', apply: addNewStart },
  { name: 'DEL', apply: removeEpsilonProductions },
  { name: 'UNIT', apply: removeUnitProductions },
  { name: 'USELESS', apply: removeUselessSymbols },
  { name: 'TERM', apply: isolateTerminals },
  { name: 'BIN', apply: binarize },
];

/** The grammar in FNC, whether it keeps ε, and the grammar after each step. */
export interface ChomskyNormalFormResult {
  /** The grammar after the last step: in FNC, with L = L(G). */
  grammar: Grammar;
  /** ε ∈ L(G): the result keeps S → ε for its start symbol. */
  acceptsEmpty: boolean;
  /** The grammar after each step, in order; the same object when the step changed nothing. */
  steps: { name: ChomskyNormalFormStepName; grammar: Grammar }[];
}

/** Converts G to Chomsky normal form, keeping every intermediate grammar for the console. */
export function toChomskyNormalForm(grammar: Grammar): ChomskyNormalFormResult {
  const steps: ChomskyNormalFormResult['steps'] = [];
  let current = grammar;
  for (const step of CHOMSKY_NORMAL_FORM_STEPS) {
    current = step.apply(current);
    steps.push({ name: step.name, grammar: current });
  }
  return {
    grammar: current,
    acceptsEmpty: current.productions.some((production) =>
      isEmptyStartProduction({ production, grammar: current }),
    ),
    steps,
  };
}

/** Whether every production of G has one of the forms allowed by the FNC. */
export function isChomskyNormalForm(grammar: Grammar): boolean {
  return productionsOutsideChomskyNormalForm(grammar).length === 0;
}

/**
 * The productions that break the FNC: anything other than A → B C (two nonterminals),
 * A → a (one terminal) or S → ε (S the start symbol). S → ε also breaks it when S appears
 * on some right side: then that ε could be used inside other productions.
 */
export function productionsOutsideChomskyNormalForm(grammar: Grammar): Production[] {
  const startOnSomeRightSide = appearsOnSomeRightSide({ grammar, symbol: grammar.start });
  return grammar.productions.filter(
    (production) =>
      !hasChomskyNormalFormShape({ production, grammar }) ||
      (startOnSomeRightSide && isEmptyStartProduction({ production, grammar })),
  );
}

/** A → B C, A → a, or S → ε for the start symbol S. */
function hasChomskyNormalFormShape({
  production,
  grammar,
}: {
  production: Production;
  grammar: Grammar;
}): boolean {
  const { rightSide } = production;
  if (rightSide.length === 2) {
    return rightSide.every((symbol) => grammar.nonterminals.has(symbol));
  }
  if (rightSide.length === 1) {
    return grammar.terminals.has(rightSide[0] ?? '');
  }
  return isEmptyStartProduction({ production, grammar });
}

/** S → ε, with S the start symbol. */
function isEmptyStartProduction({
  production,
  grammar,
}: {
  production: Production;
  grammar: Grammar;
}): boolean {
  return production.rightSide.length === 0 && production.leftSide === grammar.start;
}
