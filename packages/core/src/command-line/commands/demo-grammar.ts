/**
 * Concept: context-free grammar G = (N, Σ, P, S), shown on a grammar built in code.
 * Reference: Hopcroft 5.1; Augusto 2.4.
 * Card: docs/concepts/02-context-free-grammar.md
 */
import { buildGrammar } from '../../grammar/build.js';
import type { Grammar } from '../../grammar/types.js';
import { formatGrammar } from '../format.js';
import { EXIT_CODES, type Command } from '../types.js';

export const demoGrammarCommand: Command = {
  name: 'demo-grammar',
  description: 'Build the expression grammar in code and print G = (N, Σ, P, S)',
  usage: 'sabueso demo-grammar',
  run(_commandArguments, environment) {
    environment.writeOutput(`${formatGrammar(buildExpressionGrammar())}\n`);
    return Promise.resolve(EXIT_CODES.ok);
  },
};

/** E → E + T | T,  T → id */
function buildExpressionGrammar(): Grammar {
  return buildGrammar('expressions', [
    { leftSide: 'E', rightSide: ['E', '+', 'T'] },
    { leftSide: 'E', rightSide: ['T'] },
    { leftSide: 'T', rightSide: ['id'] },
  ]);
}
