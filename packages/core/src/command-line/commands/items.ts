/**
 * Concept: the dotted rules of a grammar, the finite universe of Earley items, and which of
 * the three operations each one triggers: Predictor, Scanner or Completer.
 * Guide: docs/guides/13-earley-items-y-conjuntos.md
 */
import { dottedRule, dottedRulesOf } from '../../earley/item.js';
import type { Grammar, Production } from '../../grammar/types.js';
import { formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  readGrammarCommandArguments,
} from '../grammar-source.js';
import { EXIT_CODES, type Command } from '../types.js';

const ITEMS_USAGE = `sabueso items ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path>`;

export const itemsCommand: Command = {
  name: 'items',
  description: 'List every dotted rule A → α • β: the finite universe of Earley items',
  usage: ITEMS_USAGE,
  async run({ commandArguments, environment }) {
    const input = readGrammarCommandArguments({
      commandArguments,
      rules: {
        flags: [],
        valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION],
      },
      usage: ITEMS_USAGE,
      environment,
      allowsPositionals: false,
    });
    if (typeof input === 'number') {
      return input;
    }
    const { source } = input;
    const grammar = await readGrammar({ source, environment });
    const rules = dottedRulesOf(grammar);
    environment.writeOutput(
      [
        `${grammar.name}: dotted rules (the universe of Earley items)`,
        formatTable({
          header: ['Production', 'Dotted rule', 'What Earley does with it'],
          rows: rules.map(({ production, dot }) => [
            String(production.id),
            dottedRule({ production, dot }),
            operationFor({ grammar, production, dot }),
          ]),
        }),
        `${rules.length} dotted rules. An item is a dotted rule plus its origin j (0 … n), so for an input of n tokens each set holds at most ${rules.length} × (n + 1) items: a finite number, which is why Earley always ends.`,
      ].join('\n\n') + '\n',
    );
    return EXIT_CODES.ok;
  },
};

/** What the symbol after the dot makes Earley do: predict a nonterminal, scan a terminal, or complete. */
function operationFor({
  grammar,
  production,
  dot,
}: {
  grammar: Grammar;
  production: Production;
  dot: number;
}): string {
  const next = production.rightSide[dot];
  if (next === undefined) {
    return `Completer: ${production.leftSide} is recognized`;
  }
  return grammar.nonterminals.has(next)
    ? `Predictor: expect ${next}`
    : `Scanner: read the token ${next}`;
}
