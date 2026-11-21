/**
 * Concept: BIN, the last step of the Chomsky normal form: each right side of length k ≥ 3
 * is split into a chain of k − 1 productions of length 2, with new nonterminals X1, X2, …
 * Reference: Hopcroft 7.1.5; SPEC 02, section 3.23.
 * Card: docs/concepts/22-chomsky-normal-form.md
 */
import type { Grammar, SymbolName } from '../grammar/types.js';
import { rewriteGrammar, type NewProduction } from './rewrite.js';

/** The prefix of the new nonterminals: X1, X2, … numbered across the whole grammar. */
export const CHAIN_PREFIX = 'X';

/**
 * G' with right sides of length at most 2: A → B1 B2 … Bk (k ≥ 3) becomes
 * A → B1 X1, X1 → B2 X2, …, X(k−2) → B(k−1) Bk, with new X for each production.
 * L(G') = L(G). Returns the same grammar when no right side is longer than 2.
 */
export function binarize(grammar: Grammar): Grammar {
  // After TERM a long right side has only nonterminals. X1 stands for "the rest after
  // B1": A ⇒ B1 X1 ⇒ B1 B2 X2 ⇒ … ⇒ B1 … Bk, the same string as A ⇒ B1 … Bk, in k − 1
  // steps. Each X has a single production, so it adds no new strings or ambiguity.
  if (grammar.productions.every((production) => production.rightSide.length <= 2)) {
    return grammar;
  }
  const newNonterminals: SymbolName[] = [];
  const productions = grammar.productions.flatMap((production) => {
    if (production.rightSide.length <= 2) {
      return [production];
    }
    const chain = chainNames({ grammar, count: production.rightSide.length - 2, newNonterminals });
    newNonterminals.push(...chain);
    return splitIntoChain({ production, chain });
  });
  return rewriteGrammar({ grammar, productions, newNonterminals });
}

/** The next `count` free names X1, X2, …: not in N or Σ, nor taken by an earlier chain. */
function chainNames({
  grammar,
  count,
  newNonterminals,
}: {
  grammar: Grammar;
  count: number;
  /** The X already created for earlier productions. */
  newNonterminals: readonly SymbolName[];
}): SymbolName[] {
  const names: SymbolName[] = [];
  for (let index = 1; names.length < count; index++) {
    const name = `${CHAIN_PREFIX}${String(index)}`;
    const isFree =
      !grammar.nonterminals.has(name) &&
      !grammar.terminals.has(name) &&
      !newNonterminals.includes(name);
    if (isFree) {
      names.push(name);
    }
  }
  return names;
}

/**
 * A → B1 … Bk with chain X1 … X(k−2): A → B1 X1, X1 → B2 X2, …, X(k−2) → B(k−1) Bk.
 * Each left side is the previous X (A for the first); each right side is one Bi and the next X.
 */
function splitIntoChain({
  production,
  chain,
}: {
  production: NewProduction;
  chain: readonly SymbolName[];
}): NewProduction[] {
  const leftSides = [production.leftSide, ...chain];
  return leftSides.map((leftSide, index) => ({
    leftSide,
    rightSide:
      index < chain.length
        ? [production.rightSide[index] ?? '', chain[index] ?? '']
        : production.rightSide.slice(index),
  }));
}
