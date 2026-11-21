/**
 * Concept: context-free grammar G = (N, Σ, P, S).
 * Reference: Hopcroft 5.1; Augusto 2.4.
 * Card: docs/concepts/02-context-free-grammar.md
 */

/** A grammar symbol: a nonterminal ('Pasos'), a tag ('CTX') or a literal ('+'). */
export type SymbolName = string;

/** A production A → α. An empty right side is the ε-production A → ε. */
export interface Production {
  /** Position in Grammar.productions, starting at 0. */
  id: number;
  /** The nonterminal A that is replaced (left side of the arrow). */
  leftSide: SymbolName;
  /** The sequence α that replaces it (right side of the arrow); empty for A → ε. */
  rightSide: SymbolName[];
}

export interface Grammar {
  name: string;
  /** Declared start symbol S. */
  start: SymbolName;
  /**
   * N: the nonterminals. After buildGrammar, exactly the left-hand sides of the rules; the steps
   * of the Chomsky normal form may keep a nonterminal with no productions (rewriteGrammar).
   */
  nonterminals: ReadonlySet<SymbolName>;
  /** Σ: every other symbol, plus the terminals declared with %terminals. */
  terminals: ReadonlySet<SymbolName>;
  /** P, numbered in the order the rules were given. */
  productions: readonly Production[];
  /** The productions of each nonterminal, so algorithms can expand A quickly. */
  productionsByLeftSide: ReadonlyMap<SymbolName, readonly Production[]>;
}

/** Start symbol of the augmented grammar ($S → S). '$' is reserved, so no rule can produce it. */
export const AUGMENTED_START = '$S';
