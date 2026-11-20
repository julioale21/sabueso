/**
 * Concept: a story is a string w ∈ Σ*: a sequence of tags separated by spaces.
 * Reference: Hopcroft 1.5; SPEC 02, sections 3.1 and 3.17.
 * Card: docs/concepts/01-alphabet-and-language.md
 *
 * Unlike a grammar file, a story needs no automaton: its only separator is the space, so
 * splitting by whitespace is enough. Every word is one symbol.
 */
import type { ParseError } from '../earley/diagnostics.js';
import type { Grammar, SymbolName } from '../grammar/types.js';

/** 'CRI  PIS\nREV' → ['CRI', 'PIS', 'REV']. Any run of spaces, tabs or line breaks separates. */
export function tokenizeSequence(text: string): SymbolName[] {
  return text.split(/\s+/).filter((word) => word !== '');
}

/**
 * Checks that every token is a terminal of the grammar, before Earley runs. Returns the
 * error of the first token outside Σ, or null when the whole story is over Σ.
 */
export function checkAlphabet(tokens: readonly SymbolName[], grammar: Grammar): ParseError | null {
  // ES: Verifica w ∈ Σ* (cada símbolo es una etiqueta que existe) antes de preguntar
  // ES: w ∈ L(G), que es trabajo de Earley. Separar los dos errores da mejores mensajes.
  const position = tokens.findIndex((token) => !grammar.terminals.has(token));
  if (position === -1) {
    return null;
  }
  return { kind: 'unknown-symbol', position, found: tokens[position] ?? null, expected: [] };
}
