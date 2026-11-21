/**
 * Concept: the dotted rules of a grammar, the finite universe of Earley items, and which of
 * the three operations each one triggers: Predictor, Scanner or Completer.
 * Reference: Earley (1970); SPEC 02, section 3.11.
 * Card: docs/concepts/11-earley-item.md
 */
import { dottedRule, dottedRulesOf } from '../../earley/item.js';
import type { Grammar, Production } from '../../grammar/types.js';
import { parseArguments } from '../arguments.js';
import { formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const ITEMS_USAGE = `sabueso items ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path>`;

export const itemsCommand: Command = {
  name: 'items',
  description: 'List every dotted rule A → α • β: the finite universe of Earley items',
  usage: ITEMS_USAGE,
  async run({ commandArguments, environment }) {
    const parsed = parseArguments({
      commandArguments,
      rules: {
        flags: [],
        valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION],
      },
    });
    if (typeof parsed === 'string') {
      return reportUsageError({ message: parsed, environment });
    }
    const source = resolveGrammarOption({ parsed, usage: ITEMS_USAGE });
    if (typeof source === 'string') {
      return reportUsageError({ message: source, environment });
    }
    if (parsed.positionals.length > 0) {
      return reportUsageError({ message: `Usage: ${ITEMS_USAGE}`, environment });
    }
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
