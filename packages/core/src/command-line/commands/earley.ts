/**
 * Concept: Earley deciding whether a story is a sentence of L(G) and, with --chart, the sets
 * S0 … Sn with every item and how it got there (Predictor, Scanner or Completer).
 * Reference: Earley (1970); SPEC 02, sections 3.12 to 3.15.
 * Cards: docs/concepts/13-predictor.md, 14-scanner.md, 15-completer.md
 */
import type { Chart, EarleySet } from '../../earley/chart.js';
import { dottedRule, isComplete, type EarleyItem, type Link } from '../../earley/item.js';
import { isEmptySpan, recognize } from '../../earley/recognizer.js';
import type { SymbolName } from '../../grammar/types.js';
import { checkAlphabet, tokenizeSequence } from '../../input/sequence.js';
import { parseArguments } from '../arguments.js';
import { formatTable } from '../format.js';
import {
  GRAMMAR_FILE_OPTION,
  GRAMMAR_OPTION,
  readGrammar,
  resolveGrammarOption,
} from '../grammar-source.js';
import { EXIT_CODES, reportUsageError, type Command } from '../types.js';

const CHART_FLAG = '--chart';
const NO_EPSILON_FIX_FLAG = '--no-epsilon-fix';
const EARLEY_USAGE = `sabueso earley ${GRAMMAR_OPTION} <grammar> | ${GRAMMAR_FILE_OPTION} <path> [${CHART_FLAG}] [${NO_EPSILON_FIX_FLAG}] "<story>"`;

export const earleyCommand: Command = {
  name: 'earley',
  description:
    'Decide with Earley whether a story is in L(G) (--chart: the sets S0 … Sn; --no-epsilon-fix: the classic bug)',
  usage: EARLEY_USAGE,
  async run(commandArguments, environment) {
    const parsed = parseArguments(commandArguments, {
      flags: [CHART_FLAG, NO_EPSILON_FIX_FLAG],
      valueOptions: [GRAMMAR_OPTION, GRAMMAR_FILE_OPTION],
    });
    if (typeof parsed === 'string') {
      return reportUsageError(parsed, environment);
    }
    const source = resolveGrammarOption(parsed, EARLEY_USAGE);
    if (typeof source === 'string') {
      return reportUsageError(source, environment);
    }
    const grammar = await readGrammar(source, environment);
    const tokens = tokenizeSequence(parsed.positionals.join(' '));
    const title = `${grammar.name}: ${tokens.length === 0 ? '(empty input)' : tokens.join(' ')}`;
    const unknown = checkAlphabet(tokens, grammar);
    if (unknown !== null) {
      environment.writeOutput(
        `${title}\n\nREJECTED: ${unknown.found ?? ''} at position ${unknown.position} is not in Σ\n`,
      );
      return EXIT_CODES.rejected;
    }
    const classicEpsilon = parsed.flags.has(NO_EPSILON_FIX_FLAG);
    const { accepted, chart } = recognize(grammar, tokens, { classicEpsilon });
    const sections = [title];
    if (classicEpsilon) {
      sections.push('Without the ε fix: the classic algorithm of Earley (1970), for comparison');
    }
    if (parsed.flags.has(CHART_FLAG)) {
      sections.push(formatChart(chart, tokens, classicEpsilon));
    }
    sections.push(
      accepted
        ? 'ACCEPTED: the input is a sentence of L(G)'
        : 'REJECTED: the input is not a sentence of L(G)',
    );
    environment.writeOutput(`${sections.join('\n\n')}\n`);
    return accepted ? EXIT_CODES.ok : EXIT_CODES.rejected;
  },
};

/** Every set, in order: 'S1 (after CRI)' and a table of its items. */
function formatChart(chart: Chart, tokens: readonly SymbolName[], classicEpsilon: boolean): string {
  return chart.map((set) => formatSet(chart, set, tokens, classicEpsilon)).join('\n\n');
}

/** One row per item, in the order it was added: number, dotted rule, origin and how it got there. */
function formatSet(
  chart: Chart,
  set: EarleySet,
  tokens: readonly SymbolName[],
  classicEpsilon: boolean,
): string {
  const token = tokens[set.index - 1];
  const title = token === undefined ? `S${set.index}` : `S${set.index} (after ${token})`;
  const rows = set.items.map((item, index) => [
    String(index + 1),
    dottedRule(item.production, item.dot),
    String(item.origin),
    describeOrigin(chart, item, classicEpsilon),
  ]);
  return `${title}: ${set.items.length} items\n\n${formatTable(['#', 'Item', 'Origin', 'How'], rows)}`;
}

/**
 * How the item got here: 'initial', 'P', 'S from S0#5', 'C from S0#3' or 'ε', several
 * separated by '; ' when the item has several links. A predicted item that already derives
 * ε is marked 'P (ignored)': with the fix, the Completer skips it.
 */
function describeOrigin(chart: Chart, item: EarleyItem, classicEpsilon: boolean): string {
  if (item.links.length === 0) {
    if (item.production.id === -1) {
      return 'initial';
    }
    return !classicEpsilon && isComplete(item) && isEmptySpan(item) ? 'P (ignored)' : 'P';
  }
  return item.links.map((link) => describeLink(chart, link)).join('; ');
}

/** One link: which operation advanced the dot and, for S and C, from which item. */
function describeLink(chart: Chart, link: Link): string {
  if (link.kind === 'nullable') {
    return 'ε';
  }
  const operation = link.kind === 'scan' ? 'S' : 'C';
  return `${operation} from ${position(chart, link.predecessor)}`;
}

/** 'S0#5': the set of the item and its number inside the set, from 1. */
function position(chart: Chart, item: EarleyItem): string {
  const index = chart[item.setIndex]?.items.indexOf(item) ?? -1;
  return `S${item.setIndex}#${index + 1}`;
}
