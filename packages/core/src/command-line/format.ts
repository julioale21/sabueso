// Plain-text formatting helpers shared by the commands.
import type { OpenItems, ParseError } from '../earley/diagnostics.js';
import { label, type EarleyItem } from '../earley/item.js';
import { formatProduction } from '../grammar/build.js';
import type { Grammar, Production, SymbolName } from '../grammar/types.js';

/** Renders rows as left-aligned columns, with a dashed line under the header. */
export function formatTable({ header, rows }: { header: string[]; rows: string[][] }): string {
  const columnCount = Math.max(header.length, ...rows.map((row) => row.length));
  const widths = Array.from({ length: columnCount }, (_, column) =>
    Math.max(...[header, ...rows].map((row) => (row[column] ?? '').length)),
  );
  const renderRow = (row: string[]): string =>
    widths
      .map((width, column) => (row[column] ?? '').padEnd(width))
      .join('  ')
      .trimEnd();
  const separator = widths.map((width) => '-'.repeat(width)).join('  ');
  return [renderRow(header), separator, ...rows.map(renderRow)].join('\n');
}

/** Renders a set in mathematical notation, sorted: '{a, b, c}'. */
export function formatSet(items: Iterable<string>): string {
  const sorted = [...new Set(items)].sort();
  return `{${sorted.join(', ')}}`;
}

/** 'S ⇒+ A ⇒+ S': a cycle written as derivations that come back to its first symbol. */
export function formatCycle(cycle: readonly string[]): string {
  return [...cycle, cycle[0] ?? ''].join(' ⇒+ ');
}

/** Renders G as its 4-tuple (N, Σ, P, S), with the productions numbered. */
export function formatGrammar(grammar: Grammar): string {
  return [
    `${grammar.name}: G = (N, Σ, P, S)`,
    `N = ${formatSet(grammar.nonterminals)}`,
    `Σ = ${formatSet(grammar.terminals)}`,
    `S = ${grammar.start}`,
    'P:',
    ...grammar.productions.map(formatNumberedProduction),
  ].join('\n');
}

/** '   0  E → E + T': the production id right-aligned, then the production. */
function formatNumberedProduction(production: Production): string {
  return `  ${String(production.id).padStart(2)}  ${formatProduction(production)}`;
}

/**
 * 'REJECTED · position 2 (event 3) · found PIS · expected: CRI, HAL'. The position counts
 * from 0, as in the spec; the event counts from 1, as a person does.
 */
export function formatRejection(error: ParseError): string {
  if (error.kind === 'unknown-symbol') {
    return `REJECTED · position ${error.position} (event ${error.position + 1}) · ${error.found ?? ''} is not in Σ`;
  }
  const place =
    error.kind === 'unexpected-end'
      ? `position ${error.position} (end of input)`
      : `position ${error.position} (event ${error.position + 1}) · found ${error.found ?? ''}`;
  const expected =
    error.expected.length === 0 ? 'incomplete input' : `expected: ${error.expected.join(', ')}`;
  return `REJECTED · ${place} · ${expected}`;
}

/**
 * The Earley items left open where a story fails, by group: the structures that had started,
 * and the rules waiting for one of the expected tags. Empty groups are left out.
 */
export function formatOpenItems(open: OpenItems): string {
  const group = (title: string, items: readonly EarleyItem[]) =>
    items.length === 0 ? [] : [`  ${title}:`, ...items.map((item) => `    ${label(item)}`)];
  return [
    `Open items in S${open.set}, where the story fails:`,
    ...group('Started and could not go on', open.started),
    ...group('Waiting for one of the expected tags', open.waiting),
  ].join('\n');
}

/**
 * The rounds of a fixed point over one set of symbols (nullable, productive, reachable): one
 * row per round with how many symbols there are so far and which ones it added. With initial
 * symbols (the start symbol, for the reachable ones), a row 0 shows them first.
 */
export function formatSymbolRounds({
  rounds,
  column,
  title,
  initial = [],
}: {
  rounds: readonly ReadonlySet<SymbolName>[];
  /** The header of the count column: 'Nullable so far', 'Symbols so far'. */
  column: string;
  /** A line above the table, if any. */
  title?: string | undefined;
  initial?: readonly SymbolName[] | undefined;
}): string {
  const start = new Set(initial);
  const startRow =
    initial.length === 0 ? [] : [['0', String(start.size), `${initial.join(', ')} (start)`]];
  const rows = rounds.map((round, index) => {
    const previous = rounds[index - 1] ?? start;
    const added = [...round].filter((symbol) => !previous.has(symbol));
    return [
      String(index + 1),
      String(round.size),
      added.length === 0 ? '(none: fixed point)' : added.sort().join(', '),
    ];
  });
  const table = formatTable({
    header: ['Round', column, 'Added in this round'],
    rows: [...startRow, ...rows],
  });
  return title === undefined ? table : `${title}\n\n${table}`;
}

/** One set per nonterminal, as FIRST and FOLLOW keep them round by round. */
export type SetsSnapshot = ReadonlyMap<SymbolName, ReadonlySet<SymbolName>>;

/**
 * The rounds of a fixed point over one set per nonterminal (FIRST, FOLLOW): one row per round
 * with what it added to each set, compared with the round before (or with start).
 */
export function formatSetsRounds({
  title,
  rounds,
  start,
}: {
  title: string;
  rounds: readonly SetsSnapshot[];
  start: SetsSnapshot;
}): string {
  const rows = rounds.map((round, index) => [
    String(index + 1),
    describeAdditions({ before: rounds[index - 1] ?? start, after: round }),
  ]);
  return `${title}\n\n${formatTable({ header: ['Round', 'Added in this round'], rows })}`;
}

/** 'Pista += {INT, PIS}; Inicio += {CRI, HAL}', or the fixed point if nothing was added. */
function describeAdditions({
  before,
  after,
}: {
  before: SetsSnapshot;
  after: SetsSnapshot;
}): string {
  const changes = [...after]
    .map(([symbol, members]) => ({
      symbol,
      added: [...members].filter((member) => !(before.get(symbol)?.has(member) ?? false)),
    }))
    .filter((change) => change.added.length > 0)
    .map((change) => `${change.symbol} += ${formatSet(change.added)}`);
  return changes.length === 0 ? '(none: fixed point)' : changes.join('; ');
}
