// Plain-text formatting helpers shared by the commands.
import { formatProduction } from '../grammar/build.js';
import type { Grammar, Production } from '../grammar/types.js';

/** Renders rows as left-aligned columns, with a dashed line under the header. */
export function table(header: string[], rows: string[][]): string {
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
export function set(items: Iterable<string>): string {
  const sorted = [...new Set(items)].sort();
  return `{${sorted.join(', ')}}`;
}

/** Renders G as its 4-tuple (N, Σ, P, S), with the productions numbered. */
export function formatGrammar(grammar: Grammar): string {
  return [
    `${grammar.name}: G = (N, Σ, P, S)`,
    `N = ${set(grammar.nonterminals)}`,
    `Σ = ${set(grammar.terminals)}`,
    `S = ${grammar.start}`,
    'P:',
    ...grammar.productions.map(formatNumberedProduction),
  ].join('\n');
}

/** '   0  E → E + T': the production id right-aligned, then the production. */
function formatNumberedProduction(production: Production): string {
  return `  ${String(production.id).padStart(2)}  ${formatProduction(production)}`;
}
