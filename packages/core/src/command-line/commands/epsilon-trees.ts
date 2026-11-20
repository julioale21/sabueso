/**
 * Concept: the ε-trees of a nullable symbol: how many ways it derives the empty string,
 * and those trees drawn. Without a symbol, the count for every nullable symbol.
 * Reference: SPEC 02, section 3.19.
 * Card: docs/concepts/18-backpointers-and-trees.md
 */
import { computeNullable } from '../../analysis/nullable.js';
import type { Grammar, SymbolName } from '../../grammar/types.js';
import { countEpsilonTrees, epsilonTrees } from '../../trees/epsilon.js';
import { renderTree } from '../../trees/render.js';
import type { TreeCount } from '../../trees/tree.js';
import { parseArguments } from '../arguments.js';
import { formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const EPSILON_TREES_USAGE = `sabueso epsilon-trees ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [<nonterminal>]`;

export const epsilonTreesCommand: Command = {
  name: 'epsilon-trees',
  description: 'Count and draw the ε-trees of a nullable symbol (none given: every nullable)',
  usage: EPSILON_TREES_USAGE,
  async run(commandArguments, environment) {
    const parsed = parseArguments(commandArguments, {
      flags: [],
      valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION],
    });
    if (typeof parsed === 'string') {
      return reportUsageError(parsed, environment);
    }
    const source = resolveGrammarOption(parsed, EPSILON_TREES_USAGE);
    if (typeof source === 'string') {
      return reportUsageError(source, environment);
    }
    const [symbol, ...extra] = parsed.positionals;
    if (extra.length > 0) {
      return reportUsageError(`Usage: ${EPSILON_TREES_USAGE}`, environment);
    }
    const grammar = await readGrammar(source, environment);
    if (symbol !== undefined && !grammar.nonterminals.has(symbol)) {
      return reportUsageError(`"${symbol}" is not a nonterminal of ${grammar.name}`, environment);
    }
    const nullable = computeNullable(grammar);
    const text =
      symbol === undefined
        ? formatAllNullable(grammar, nullable)
        : formatSymbolTrees(grammar, nullable, symbol);
    environment.writeOutput(`${text}\n`);
    return EXIT_CODES.ok;
  },
};

/** One row per nullable symbol with how many ε-trees it has. */
function formatAllNullable(grammar: Grammar, nullable: ReadonlySet<SymbolName>): string {
  if (nullable.size === 0) {
    return `${grammar.name}: no nullable symbols, so no ε-trees`;
  }
  const rows = [...nullable].map((symbol) => [
    symbol,
    formatCount(countEpsilonTrees(grammar, nullable, symbol)),
  ]);
  return `${grammar.name}: ε-trees of each nullable symbol\n\n${formatTable(['Nonterminal', 'ε-trees'], rows)}`;
}

/** The count of the symbol and each of its ε-trees, numbered. */
function formatSymbolTrees(
  grammar: Grammar,
  nullable: ReadonlySet<SymbolName>,
  symbol: SymbolName,
): string {
  if (!nullable.has(symbol)) {
    return `${grammar.name}: ${symbol} does not derive ε, so it has no ε-trees`;
  }
  const count = countEpsilonTrees(grammar, nullable, symbol);
  const trees = epsilonTrees(grammar, nullable, symbol);
  const header =
    count === 'infinite'
      ? `${grammar.name}: ${symbol} ⇒* ε in infinitely many ways (a cycle). The ${trees.length} without repeated symbols:`
      : `${grammar.name}: ${symbol} ⇒* ε, ${formatCount(count)}`;
  const drawn = trees.map((tree, index) => `Tree ${index + 1}:\n${renderTree(tree)}`);
  return [header, ...drawn].join('\n\n');
}

/** '1 tree', '4 trees' or 'infinite'. */
function formatCount(count: TreeCount): string {
  if (count === 'infinite') {
    return 'infinite';
  }
  return `${count} ${count === 1n ? 'tree' : 'trees'}`;
}
