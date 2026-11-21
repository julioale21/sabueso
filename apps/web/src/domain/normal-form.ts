/**
 * The six steps of the Chomsky normal form as the view shows them (card 22): what each step
 * does, and which productions it added and removed, compared as text.
 */
import type { Grammar } from '@sabueso/core';
import { productionText } from './productions';

export const STEP_DESCRIPTIONS: Record<string, string> = {
  START: 'un símbolo inicial nuevo S0 → S, si S aparece en algún lado derecho',
  DEL: 'quita las producciones ε (queda S → ε solo si ε ∈ L(G))',
  UNIT: 'quita las producciones unitarias A → B, con los pares unitarios',
  USELESS: 'quita los no terminales no productivos o no alcanzables',
  TERM: 'cambia cada terminal a por T_a → a en los lados derechos de largo 2 o más',
  BIN: 'parte los lados derechos de largo 3 o más en una cadena X1, X2, …',
};

export interface StepChanges {
  added: string[];
  removed: string[];
}

/** The productions of `after` that `before` lacks, and the other way around. */
export function stepChanges({ before, after }: { before: Grammar; after: Grammar }): StepChanges {
  const beforeTexts = before.productions.map(productionText);
  const afterTexts = after.productions.map(productionText);
  const beforeSet = new Set(beforeTexts);
  const afterSet = new Set(afterTexts);
  return {
    added: afterTexts.filter((text) => !beforeSet.has(text)),
    removed: beforeTexts.filter((text) => !afterSet.has(text)),
  };
}
