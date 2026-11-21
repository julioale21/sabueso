// Reads built-in grammars with node:fs, only in the tests. The program itself reads files
// through the injected environment.
import { readFileSync } from 'node:fs';
import {
  builtInGrammarPath,
  findBuiltInGrammar,
} from '../../src/command-line/built-in-grammars.js';
import { parseGrammarText } from '../../src/grammar-format/parser.js';
import type { Grammar } from '../../src/grammar/types.js';

/** The text of a built-in grammar, by name or alias ('detective/g1', 'g1', 'meta'…). */
export function readBuiltInGrammarText(name: string): string {
  const grammar = findBuiltInGrammar(name);
  if (grammar === undefined) {
    throw new Error(`Unknown built-in grammar: ${name}`);
  }
  return readFileSync(builtInGrammarPath(grammar), 'utf8');
}

/** A built-in grammar, read and built with the whole chain. */
export function loadBuiltInGrammar(name: string): Grammar {
  return parseGrammarText({ text: readBuiltInGrammarText(name), name });
}

/** The fixture L1: CRI, 198 × PIS, REV. */
export function readL1(): string[] {
  const text = readFileSync(new URL('../fixtures/l1.txt', import.meta.url), 'utf8');
  return text.trim().split(/\s+/);
}
