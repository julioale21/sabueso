// Plain-text formatting helpers shared by the commands.

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
