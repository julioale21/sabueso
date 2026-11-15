/**
 * Concept: context-free grammar G = (N, Σ, P, S), shown on a grammar built in code.
 * Reference: Hopcroft 5.1; Augusto 2.4.
 * Card: docs/concepts/02-context-free-grammar.md
 */
import { buildGrammar } from '../../grammar/build.js';
import type { Grammar } from '../../grammar/types.js';
import { formatGrammar } from '../format.js';
import { EXIT_CODES, type CliCommand } from '../types.js';

export const demoGrammarCommand: CliCommand = {
  name: 'demo-grammar',
  description: 'Build the expression grammar in code and print G = (N, Σ, P, S)',
  usage: 'sabueso demo-grammar',
  run(_args, io) {
    io.stdout(`${formatGrammar(buildExpressionGrammar())}\n`);
    return Promise.resolve(EXIT_CODES.ok);
  },
};

/** E → E + T | T,  T → id */
function buildExpressionGrammar(): Grammar {
  return buildGrammar('expressions', [
    { lhs: 'E', rhs: ['E', '+', 'T'] },
    { lhs: 'E', rhs: ['T'] },
    { lhs: 'T', rhs: ['id'] },
  ]);
}
