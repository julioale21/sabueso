/**
 * Concept: CYK on a story: the grammar is converted to Chomsky normal form, the triangular
 * table T[i][l] is filled, and one tree in FNC is drawn. With --compare, the Earley tree of
 * the grammar as written goes next to it: the FNC changes the shape of the trees.
 * Card: docs/concepts/23-cocke-younger-kasami.md
 */
import { toChomskyNormalForm } from '../../chomsky-normal-form/index.js';
import {
  recognizeCockeYoungerKasami,
  type CockeYoungerKasamiResult,
} from '../../cocke-younger-kasami/recognizer.js';
import { recognize } from '../../earley/recognizer.js';
import type { Grammar, SymbolName } from '../../grammar/types.js';
import { checkAlphabet, tokenizeSequence } from '../../input/sequence.js';
import { parseTrees } from '../../trees/enumerate.js';
import { renderTree } from '../../trees/render.js';
import type { ParseTree } from '../../trees/tree.js';
import { formatRejection, formatSet, formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  readGrammarCommandArguments,
} from '../grammar-source.js';
import { EXIT_CODES, type Command } from '../types.js';

const COMPARE_FLAG = '--compare';
const CYK_USAGE = `sabueso cocke-younger-kasami ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${COMPARE_FLAG}] "<story>"`;

export const cockeYoungerKasamiCommand: Command = {
  name: 'cocke-younger-kasami',
  description:
    'Decide with CYK on the grammar in Chomsky normal form: table, verdict and tree (--compare: next to the Earley tree)',
  usage: CYK_USAGE,
  async run({ commandArguments, environment }) {
    const input = readGrammarCommandArguments({
      commandArguments,
      rules: { flags: [COMPARE_FLAG], valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION] },
      usage: CYK_USAGE,
      environment,
    });
    if (typeof input === 'number') {
      return input;
    }
    const { parsed, source } = input;
    const grammar = await readGrammar({ source, environment });
    const tokens = tokenizeSequence(parsed.positionals.join(' '));
    const title = `${grammar.name}: CYK on ${tokens.length === 0 ? '(empty input)' : tokens.join(' ')}`;
    const unknown = checkAlphabet({ tokens, grammar });
    if (unknown !== null) {
      environment.writeOutput(`${title}\n\n${formatRejection(unknown)}\n`);
      return EXIT_CODES.rejected;
    }
    const normalForm = toChomskyNormalForm(grammar).grammar;
    const result = recognizeCockeYoungerKasami({ grammar: normalForm, tokens });
    const sections = [
      title,
      `Grammar in Chomsky normal form: ${normalForm.productions.length} productions (see \`sabueso chomsky-normal-form\`)`,
    ];
    if (tokens.length > 0) {
      sections.push(formatCykTable({ result, tokens }));
    }
    sections.push(formatVerdict({ result, grammar: normalForm, length: tokens.length }));
    if (result.tree !== null) {
      sections.push(
        parsed.flags.has(COMPARE_FLAG)
          ? formatComparison({ normalFormTree: result.tree, grammar, tokens })
          : `Tree in Chomsky normal form:\n${renderTree(result.tree)}`,
      );
    }
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return result.accepted ? EXIT_CODES.ok : EXIT_CODES.rejected;
  },
};

/**
 * The triangular table, longest substrings on top: row l has the cells T[0][l] … T[n−l][l],
 * under the token where each substring starts. ∅ is an empty cell.
 */
function formatCykTable({
  result,
  tokens,
}: {
  result: CockeYoungerKasamiResult;
  tokens: readonly SymbolName[];
}): string {
  const header = ['l \\ i', ...tokens.map((token, start) => `${start}: ${token}`)];
  const rows = tokens.map((_, index) => {
    const length = tokens.length - index;
    const cells = tokens
      .slice(0, tokens.length - length + 1)
      .map((_token, start) => formatCell(result.table[start]?.[length]));
    return [`l = ${length}`, ...cells];
  });
  return [
    'Table T[i][l]: the nonterminals that derive the l tokens from position i',
    formatTable({ header, rows }),
  ].join('\n');
}

/** '{S0, S}', or ∅ for an empty cell. */
function formatCell(cell: ReadonlySet<SymbolName> | undefined): string {
  return cell === undefined || cell.size === 0 ? '∅' : formatSet(cell);
}

/** 'ACCEPTED: S0 ∈ T[0][4]', 'REJECTED: S0 ∉ T[0][4]', or the S → ε case for the empty input. */
function formatVerdict({
  result,
  grammar,
  length,
}: {
  result: CockeYoungerKasamiResult;
  grammar: Grammar;
  length: number;
}): string {
  if (length === 0) {
    return result.accepted
      ? `ACCEPTED: ${grammar.start} → ε is in the grammar, so ε ∈ L(G)`
      : `REJECTED: there is no ${grammar.start} → ε, so ε ∉ L(G)`;
  }
  const cell = `T[0][${length}]`;
  return result.accepted
    ? `ACCEPTED: ${grammar.start} ∈ ${cell}`
    : `REJECTED: ${grammar.start} ∉ ${cell}`;
}

/**
 * The FNC tree and the Earley tree of the grammar as written, side by side, and which
 * nonterminals appear in only one of them: the T_a and X of the FNC, and the unit and ε
 * nodes that the FNC removed.
 */
function formatComparison({
  normalFormTree,
  grammar,
  tokens,
}: {
  normalFormTree: ParseTree;
  grammar: Grammar;
  tokens: readonly SymbolName[];
}): string {
  // Earley accepts whenever CYK does (both decide w ∈ L(G)); its first tree is the one
  // `sabueso trees` draws first.
  const [earleyTree] = parseTrees({
    grammar,
    recognition: recognize({ grammar, tokens }),
    limit: 1,
  });
  if (earleyTree === undefined) {
    return `Tree in Chomsky normal form:\n${renderTree(normalFormTree)}`;
  }
  const normalFormSymbols = nonterminalsOf(normalFormTree);
  const earleySymbols = nonterminalsOf(earleyTree);
  const onlyIn = (symbols: Set<SymbolName>, others: Set<SymbolName>): string => {
    const only = [...symbols].filter((symbol) => !others.has(symbol));
    return only.length === 0 ? 'none' : only.join(', ');
  };
  return [
    sideBySide({
      left: ['Chomsky normal form (CYK)', ...renderTree(normalFormTree).split('\n')],
      right: ['Grammar as written (Earley)', ...renderTree(earleyTree).split('\n')],
    }),
    `Only in the CYK tree: ${onlyIn(normalFormSymbols, earleySymbols)}`,
    `Only in the Earley tree: ${onlyIn(earleySymbols, normalFormSymbols)}`,
  ].join('\n');
}

/** The inner nodes of a tree, by symbol, in preorder. */
function nonterminalsOf(tree: ParseTree): Set<SymbolName> {
  if (tree.kind !== 'nonterminal') {
    return new Set();
  }
  return new Set([tree.symbol, ...tree.children.flatMap((child) => [...nonterminalsOf(child)])]);
}

/** Two blocks of lines in two columns, the left one padded to its widest line. */
function sideBySide({ left, right }: { left: string[]; right: string[] }): string {
  const width = Math.max(...left.map((line) => line.length));
  return Array.from({ length: Math.max(left.length, right.length) }, (_, index) =>
    `${(left[index] ?? '').padEnd(width)}    ${right[index] ?? ''}`.trimEnd(),
  ).join('\n');
}
