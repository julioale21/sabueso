/**
 * Concept: from a context-free grammar to a pushdown automaton that accepts the same
 * language by empty stack, with a single state: expand a nonterminal on top of the stack,
 * or match a terminal on top with the next token.
 * Card: docs/concepts/24-pushdown-automaton.md
 */
import type { Grammar, Production, SymbolName } from '../grammar/types.js';

/**
 * P = ({q}, Σ, Γ, δ, q, S) with Γ = N ∪ Σ, accepting by empty stack. The single state q is
 * kept only to match the definition: every transition goes from q to q.
 */
export interface PushdownAutomaton {
  state: 'q';
  /** Σ, the tags the automaton reads. */
  inputAlphabet: Set<SymbolName>;
  /** Γ = N ∪ Σ: the stack holds what is still to be derived. */
  stackAlphabet: Set<SymbolName>;
  /** Z0 = S: the stack starts with the start symbol alone. */
  startStack: SymbolName;
  /** δ: one expand per production, then one match per terminal. */
  transitions: PushdownTransition[];
}

/**
 * - expand: δ(q, ε, A) ∋ (q, β) for A → β: replace A on top by β, without reading input;
 * - match: δ(q, a, a) = {(q, ε)}: pop a when the next token is a.
 */
export type PushdownTransition =
  | { kind: 'expand'; top: SymbolName; push: SymbolName[]; production: Production }
  | { kind: 'match'; terminal: SymbolName };

/** The pushdown automaton of the grammar (card 24): N(P) = L(G). */
export function buildPushdownAutomaton(grammar: Grammar): PushdownAutomaton {
  // The stack is the part of a leftmost sentential form still to be derived: expanding
  // the top is a step of a leftmost derivation, and matching consumes the terminals that
  // the derivation already produced on the left.
  const expansions: PushdownTransition[] = grammar.productions.map((production) => ({
    kind: 'expand',
    top: production.leftSide,
    push: [...production.rightSide],
    production,
  }));
  const matches: PushdownTransition[] = [...grammar.terminals].map((terminal) => ({
    kind: 'match',
    terminal,
  }));
  return {
    state: 'q',
    inputAlphabet: new Set(grammar.terminals),
    stackAlphabet: new Set([...grammar.nonterminals, ...grammar.terminals]),
    startStack: grammar.start,
    transitions: [...expansions, ...matches],
  };
}
