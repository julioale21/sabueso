// Plain-text formatting helpers shared by the commands.
import type { ParseError } from '../earley/diagnostics.js';
import { formatProduction } from '../grammar/build.js';
import type { Grammar, Production } from '../grammar/types.js';

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
