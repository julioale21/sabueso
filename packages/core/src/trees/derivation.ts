/**
 * Concept: the leftmost derivation of a parse tree: the sentential forms S ⇒ … ⇒ w, each
 * one replacing the leftmost nonterminal. Tree and leftmost derivation say the same thing.
 * Reference: Hopcroft 5.2.5; SPEC 02, section 3.22.
 * Card: docs/concepts/20-leftmost-derivation.md
 */
import type { Production, SymbolName } from '../grammar/types.js';
import type { ParseTree } from './tree.js';

/** One step: the sentential form after it and the production applied (null for the first). */
export interface DerivationStep {
  form: SymbolName[];
  production: Production | null;
}

/**
 * The leftmost derivation of a tree. Its productions, in preorder (a node before its
 * children, children from left to right), are exactly the order in which a leftmost
 * derivation applies them.
 */
export function leftmostDerivation(tree: ParseTree): DerivationStep[] {
  // In a leftmost derivation the next nonterminal to expand is always the leftmost one
  // still in the form. Walking the tree in preorder visits the nodes in that same order:
  // a node is expanded, and then everything below it from left to right, before its
  // right siblings. So each production of the preorder replaces the leftmost nonterminal.
  if (tree.kind !== 'nonterminal') {
    return [];
  }
  const steps: DerivationStep[] = [{ form: [tree.symbol], production: null }];
  let form: SymbolName[] = [tree.symbol];
  for (const production of productionsInPreorder(tree)) {
    form = replaceLeftmostNonterminal(form, production);
    steps.push({ form, production });
  }
  return steps;
}

/** The productions of the inner nodes, a node before its children, left to right. */
function productionsInPreorder(tree: ParseTree): Production[] {
  if (tree.kind !== 'nonterminal') {
    return [];
  }
  return [tree.production, ...tree.children.flatMap(productionsInPreorder)];
}

/**
 * The form with its leftmost nonterminal (the left side of the production) replaced by the
 * right side. An ε-production just removes it.
 */
function replaceLeftmostNonterminal(
  form: readonly SymbolName[],
  production: Production,
): SymbolName[] {
  // The preorder guarantees that the first occurrence of the left side that is still a
  // nonterminal is the leftmost nonterminal: every symbol before it is already a terminal.
  const position = form.indexOf(production.leftSide);
  return [...form.slice(0, position), ...production.rightSide, ...form.slice(position + 1)];
}
